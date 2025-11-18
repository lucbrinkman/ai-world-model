'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Document, DocumentData } from '@/lib/types'

/**
 * Save or update a document
 * If documentId is null, creates a new document
 * Otherwise updates the existing document
 */
export async function saveDocument(
  documentId: string | null,
  name: string,
  data: DocumentData
) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to save documents' }
  }

  // If documentId is provided, update existing document
  if (documentId) {
    const { data: updatedDoc, error } = await supabase
      .from('documents')
      .update({
        name,
        data,
        updated_at: new Date().toISOString(),
        last_opened_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating document:', error)
      return { error: 'Failed to update document' }
    }

    revalidatePath('/')
    return { data: updatedDoc as Document, error: null }
  }

  // Otherwise, create new document
  // Generate name if empty or check for duplicates
  let documentName = name?.trim()
  if (!documentName) {
    documentName = await getNextUntitledName(user.id)
  } else {
    // Check if the name already exists
    const nameExists = await documentNameExists(user.id, documentName)
    if (nameExists) {
      // If name exists during auto-save, generate a unique name
      documentName = await getNextUntitledName(user.id)
    }
  }

  const { data: newDoc, error } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      name: documentName,
      data,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating document:', error)
    return { error: 'Failed to create document' }
  }

  revalidatePath('/')
  return { data: newDoc as Document, error: null }
}

/**
 * Get all documents for the current user, sorted by last opened
 */
export async function getUserDocuments(): Promise<{
  data: Document[] | null
  error: string | null
}> {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'You must be logged in to view documents' }
  }

  // Get user's documents
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', user.id)
    .order('last_opened_at', { ascending: false })

  if (error) {
    console.error('Error fetching documents:', error)
    return { data: null, error: 'Failed to fetch documents' }
  }

  return { data: data as Document[], error: null }
}

/**
 * Load a specific document and update its last_opened_at timestamp
 */
export async function loadDocument(documentId: string): Promise<{
  data: Document | null
  error: string | null
}> {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'You must be logged in to load documents' }
  }

  // Update last_opened_at
  const { data, error } = await supabase
    .from('documents')
    .update({
      last_opened_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error loading document:', error)
    return { data: null, error: 'Failed to load document' }
  }

  revalidatePath('/')
  return { data: data as Document, error: null }
}

/**
 * Create a new blank document
 * If name is not provided or is empty, generates "Untitled Document N"
 */
export async function createDocument(
  name: string | null,
  data: DocumentData
): Promise<{
  data: Document | null
  error: string | null
}> {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'You must be logged in to create documents' }
  }

  // Generate name if not provided
  let documentName = name?.trim()
  if (!documentName) {
    documentName = await getNextUntitledName(user.id)
  } else {
    // Check if the name already exists
    const nameExists = await documentNameExists(user.id, documentName)
    if (nameExists) {
      return { data: null, error: 'A document with this name already exists' }
    }
  }

  const { data: newDoc, error } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      name: documentName,
      data,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating document:', error)
    return { data: null, error: 'Failed to create document' }
  }

  revalidatePath('/')
  return { data: newDoc as Document, error: null }
}

/**
 * Check if a document name already exists for the user
 */
async function documentNameExists(userId: string, name: string, excludeDocumentId?: string): Promise<boolean> {
  const supabase = await createClient()

  let query = supabase
    .from('documents')
    .select('id')
    .eq('user_id', userId)
    .eq('name', name)

  if (excludeDocumentId) {
    query = query.neq('id', excludeDocumentId)
  }

  const { data } = await query.limit(1)

  return (data?.length ?? 0) > 0
}

/**
 * Generate the next available "Untitled Document N" name
 */
async function getNextUntitledName(userId: string): Promise<string> {
  const supabase = await createClient()

  // Get all existing documents with names starting with "Untitled Document"
  const { data } = await supabase
    .from('documents')
    .select('name')
    .eq('user_id', userId)
    .ilike('name', 'Untitled Document%')

  if (!data || data.length === 0) {
    return 'Untitled Document 1'
  }

  // Extract numbers from existing names
  const numbers = data
    .map(doc => {
      const match = doc.name.match(/^Untitled Document (\d+)$/)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter(n => n > 0)

  // Find the next available number
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0
  return `Untitled Document ${maxNumber + 1}`
}

/**
 * Rename a document
 */
export async function renameDocument(documentId: string, newName: string) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to rename documents' }
  }

  // Check if the new name already exists (excluding the current document)
  const nameExists = await documentNameExists(user.id, newName, documentId)
  if (nameExists) {
    return { error: 'A document with this name already exists' }
  }

  const { data, error } = await supabase
    .from('documents')
    .update({
      name: newName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error renaming document:', error)
    return { error: 'Failed to rename document' }
  }

  revalidatePath('/')
  return { data: data as Document, error: null }
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId: string) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to delete documents' }
  }

  // Delete document (RLS will ensure they can only delete their own)
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting document:', error)
    return { error: 'Failed to delete document' }
  }

  revalidatePath('/')
  return { error: null }
}

/**
 * Get the most recently opened document for the current user
 */
export async function getLastOpenedDocument(): Promise<{
  data: Document | null
  error: string | null
}> {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'You must be logged in to load documents' }
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', user.id)
    .order('last_opened_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    // No documents found is not an error
    if (error.code === 'PGRST116') {
      return { data: null, error: null }
    }
    console.error('Error fetching last document:', error)
    return { data: null, error: 'Failed to fetch document' }
  }

  return { data: data as Document, error: null }
}

/**
 * Toggle document sharing on/off
 * Returns the share_token when sharing is enabled
 */
export async function toggleDocumentSharing(documentId: string): Promise<{
  data: { is_public: boolean; share_token: string | null } | null
  error: string | null
}> {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'You must be logged in to share documents' }
  }

  // First, get the current document to check ownership and current state
  const { data: currentDoc, error: fetchError } = await supabase
    .from('documents')
    .select('is_public, share_token, user_id')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single()

  if (fetchError) {
    console.error('Error fetching document:', fetchError)
    return { data: null, error: 'Failed to fetch document' }
  }

  // Toggle the is_public state
  const newIsPublic = !currentDoc.is_public

  const { data, error } = await supabase
    .from('documents')
    .update({
      is_public: newIsPublic,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('user_id', user.id)
    .select('is_public, share_token')
    .single()

  if (error) {
    console.error('Error toggling document sharing:', error)
    return { data: null, error: 'Failed to toggle sharing' }
  }

  revalidatePath('/')
  return {
    data: {
      is_public: data.is_public,
      share_token: data.is_public ? data.share_token : null,
    },
    error: null,
  }
}

/**
 * Fork (copy) a document by its share token
 * Creates a new document for the current user (or returns null for anonymous users to save to localStorage)
 */
export async function forkDocument(shareToken: string): Promise<{
  data: { document: Document; isOwner: boolean } | null
  error: string | null
}> {
  const supabase = await createClient()

  // Get the shared document (this works even if user is not authenticated due to RLS policy)
  const { data: sharedDoc, error: fetchError } = await supabase
    .from('documents')
    .select('*')
    .eq('share_token', shareToken)
    .eq('is_public', true)
    .single()

  if (fetchError || !sharedDoc) {
    console.error('Error fetching shared document:', fetchError)
    return { data: null, error: 'Shared document not found' }
  }

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is the owner, return the original document
  if (user && user.id === sharedDoc.user_id) {
    return {
      data: {
        document: sharedDoc as Document,
        isOwner: true,
      },
      error: null,
    }
  }

  // If user is not authenticated, return the document data for localStorage handling
  if (!user) {
    return {
      data: {
        document: sharedDoc as Document,
        isOwner: false,
      },
      error: null,
    }
  }

  // Create a copy for the authenticated user
  const { data: forkedDoc, error: createError } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      name: `${sharedDoc.name} (Copy)`,
      data: sharedDoc.data,
      is_public: false,
    })
    .select()
    .single()

  if (createError) {
    console.error('Error forking document:', createError)
    return { data: null, error: 'Failed to create copy' }
  }

  revalidatePath('/')
  return {
    data: {
      document: forkedDoc as Document,
      isOwner: false,
    },
    error: null,
  }
}
