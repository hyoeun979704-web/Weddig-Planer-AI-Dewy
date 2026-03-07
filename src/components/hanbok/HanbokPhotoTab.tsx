const HanbokPhotoTab = () => {
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-bold text-lg">한복 갤러리</h3>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div key={i} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
            <span className="text-2xl opacity-30">👗</span>
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground py-4">사진이 준비중입니다</p>
    </div>
  );
};

export default HanbokPhotoTab;
