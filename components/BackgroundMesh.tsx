/** Near-black with a very subtle cool-blue atmospheric depth. No warm/gold tones. */
export function BackgroundMesh() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      {/* Pure black base */}
      <div className="absolute inset-0 bg-[#080808]" />

      {/* Very faint cool-blue depth — like a dark arena ceiling */}
      <div className="absolute left-1/2 top-[-10%] h-[55vh] w-[110%] -translate-x-1/2 rounded-full bg-blue-950/20 blur-[120px]" />
      {/* Subtle red glow at the bottom — stage heat */}
      <div className="absolute bottom-[-15%] left-1/2 h-[35vh] w-[80%] -translate-x-1/2 rounded-full bg-red-950/25 blur-[100px]" />

      {/* Fine scan lines for texture */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)",
          backgroundSize: "100% 3px",
        }}
      />
    </div>
  );
}
