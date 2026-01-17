const HeroBanner = () => {
  return (
    <div className="relative w-full h-48 bg-gradient-to-br from-primary/90 to-primary overflow-hidden rounded-2xl mx-4 mt-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNIC0xMCwzMCBoIDYwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
      <div className="relative z-10 flex flex-col justify-center h-full px-6 text-primary-foreground">
        <p className="text-sm font-medium opacity-90 mb-1">특별한 날을 위한</p>
        <h2 className="text-2xl font-bold mb-2">완벽한 웨딩홀을<br />찾아보세요</h2>
        <p className="text-sm opacity-80">전국 1,000+ 웨딩홀 비교</p>
      </div>
      <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10" />
    </div>
  );
};

export default HeroBanner;
