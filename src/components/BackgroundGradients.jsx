export default function BackgroundGradients() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      <div 
        className="absolute top-0 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: '8s' }}
      />
      <div 
        className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-accent/3 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: '10s', animationDelay: '2s' }}
      />
      <div 
        className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-blue-500/3 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: '12s', animationDelay: '4s' }}
      />
      <div 
        className="absolute top-2/3 right-1/3 w-80 h-80 bg-accent/4 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: '9s', animationDelay: '1s' }}
      />
    </div>
  );
}
