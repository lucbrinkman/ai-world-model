export default function MobileWarning() {
  return (
    <div className="fixed inset-0 bg-[#0C0A16] z-[9999] flex items-center justify-center p-6 md:hidden">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          Desktop Only
        </h1>
        <p className="text-gray-300">
          Map of AI Futures is currently only available on desktop devices.
          Please visit this site on a desktop or laptop computer for the full experience.
        </p>
      </div>
    </div>
  );
}
