import Link from 'next/link';

export default function About() {
  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Map of AI Futures</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-m text-sm transition-colors"
          >
            Back to Map
          </Link>
        </div>
        <p className="text-gray-400">
          <a
            href="https://swantescholz.github.io/aifutures"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            swantescholz.github.io/aifutures
          </a>
        </p>
      </header>

      {/* Background */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Background</h2>
        <div className="space-y-4 text-gray-300">
          <p>
            Many experts and CEOs of the leading AI companies think advanced AI could pose
            catastrophic, or even existential risks to humanity.
          </p>
          <p>
            I think we should take these concerns extremely seriously, and work hard to ensure
            that AI is developed in a way that is safe and beneficial for humanity.
          </p>
          <p>
            This map is an attempt to visualize some of the key questions and uncertainties that
            could determine the future of AI, and to explore how different assumptions about these
            questions could lead to different outcomes.
          </p>
        </div>
      </section>

      {/* How to use */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">How to use</h2>
        <ul className="space-y-2 text-gray-300 list-disc list-inside">
          <li>
            White nodes are questions; grey nodes are intermediate states; red/yellow/green nodes
            are bad/ambiguous/good outcomes.
          </li>
          <li>
            Adjust the sliders to set the conditional probabilities for each question.
          </li>
          <li>
            The map and charts will update in real-time to show the probabilities for each node
            and outcome category.
          </li>
          <li>
            Adjust the settings to make more likely paths bolder, or less likely paths
            transparent. By setting the minimum opacity to zero, impossible branches of the map
            will become fully transparent.
          </li>
          <li>
            Click on a node to set it as the root node for the probability calculations, i.e.
            &quot;what happens if we assume we have reached this state?&quot;. Click the same node again, or
            the &quot;START HERE&quot; node to reset the probability mass to the start.
          </li>
          <li>
            For clicked and hovered-over nodes in the map, the corresponding sliders in the
            sidebar are highlighted in the same color, and vice-versa.
          </li>
          <li>
            The number in each node represents the total probability (in %) to reach this node.
          </li>
          <li>
            The numbers on edges represents the the chosen conditional probabilities for each
            question.
          </li>
        </ul>
      </section>

      {/* Caveats */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Caveats</h2>
        <ul className="space-y-2 text-gray-300 list-disc list-inside">
          <li>
            The future is notoriously difficult to predict. I&apos;m not an AI expert, and I&apos;m sure
            this map is flawed in various ways. Any outcome probabilities computed here are highly
            speculative, and should be taken with a grain of salt.
          </li>
          <li>
            Consider this map as a reflection and conversation tool for exploring your own
            assumptions, and comparing them with those from a person with a different intuition
            about the future of AI.
          </li>
          <li>
            The sliders represent <strong>conditional</strong> probabilities, i.e. the probability
            for the given question assuming we reached the corresponding node in the graph.
          </li>
          <li>
            I&apos;m planning to publish updated/improved version of this site.{' '}
            <a
              href="https://swantescholz.github.io/aifutures"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              swantescholz.github.io/aifutures
            </a>{' '}
            will always forward you to the newest version.
          </li>
        </ul>
      </section>

      {/* Glossary */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Glossary</h2>
        <ul className="space-y-2 text-gray-300">
          <li>
            <strong>AGI</strong>: Artificial General Intelligence, an advanced AI that can perform
            any intellectual task that a human can.
          </li>
          <li>
            <strong>Transformative AI</strong>: An AI that would lead to a future that is radically
            different from the present, for better or worse. A societal change at least as big as
            the Industrial Revolution.
          </li>
          <li>
            <strong>Catastrophe</strong>: Let&apos;s define a catastrophe here as an event that leads to
            at least either 1 million deaths or 1 trillion USD of economic damages.
          </li>
          <li>
            <strong>Existential Catastrophe</strong>: A catastrophic event that would lead to the
            destruction of humanity&apos;s long-term potential, such as human extinction or the
            permanent collapse of civilization.
          </li>
          <li>
            <strong>Ambivalent Outcome</strong>: An outcome that could lead to both a good or a bad
            future for humanity, or to a morally ambiguous situation.
          </li>
          <li>
            <strong>Good Outcome</strong>: An outcome that would lead to a future that is good for
            humanity by most common moral perspectives.
          </li>
          <li>
            <strong>Permanent</strong>: For the purposes of this flowchart, let&apos;s define
            &quot;permanent&quot; as &quot;for the next 100 years&quot;.
          </li>
        </ul>
      </section>

      {/* Further reading */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Further reading</h2>
        <ul className="space-y-2 text-gray-300">
          <li>
            <a
              href="https://en.wikipedia.org/wiki/Existential_risk_from_artificial_general_intelligence"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Existential risk from artificial general intelligence (Wikipedia)
            </a>
          </li>
          <li>
            <a
              href="https://arxiv.org/abs/2306.12001"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              An Overview of Catastrophic AI Risks (Center for AI Safety)
            </a>
          </li>
          <li>
            <a
              href="https://www.safe.ai/work/statement-on-ai-risk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Statement on AI Risk (Center for AI Safety)
            </a>
          </li>
          <li>
            <a
              href="https://80000hours.org/problem-profiles/artificial-intelligence/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Preventing an AI-related catastrophe (80,000 Hours)
            </a>
          </li>
        </ul>
      </section>

      {/* Feedback */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Feedback</h2>
        <p className="text-gray-300 mb-2">
          If you have any feedback about this map (both about the questions/structure or the user
          interface), please let me know via this{' '}
          <a
            href="https://forms.gle/begpVWQZ29qijYUu6"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Feedback Form
          </a>
          .
        </p>
        <p className="text-gray-300">
          I&apos;m planning to incorporate the feedback I receive in future versions of this map.
        </p>
      </section>

      {/* Authors */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Authors</h2>
        <p className="text-gray-300 mb-2">
          Swante Scholz, 2024.{' '}
          <a
            href="https://github.com/swantescholz/aifutures/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Code repository (Github)
          </a>
          . Feel free to modify and share this code. It is released under the Unlicense.
        </p>
        <p className="text-gray-300">All views expressed here are my own.</p>
      </section>
    </div>
  );
}
