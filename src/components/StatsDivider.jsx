export default function StatsDivider({ stats }) {
  return (
    <div className="my-12 px-10">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent blur-xl" />
        
        <div className="relative flex items-center justify-center gap-12 py-8 rounded-xl bg-white/[0.02] backdrop-blur-sm border border-white/5 shadow-lg shadow-black/10">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="group text-center transition-transform duration-300 hover:scale-105"
            >
              <div className="text-3xl font-bold bg-gradient-to-br from-white to-brand-text-tertiary bg-clip-text text-transparent mb-1.5 group-hover:from-accent group-hover:to-accent-hover transition-all duration-300">
                {stat.value}
              </div>
              <div className="text-xs text-brand-text-tertiary/70 uppercase tracking-wider font-semibold group-hover:text-brand-text-tertiary transition-colors duration-300">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
