export function responsiveLayout(width: number, height: number) {
  const tablet = width >= 768;
  const contentWidth = Math.max(0, Math.min(width, 1120));
  return { tablet, landscape: width > height, contentWidth, sheetWidth: Math.min(width, 720), columns: width >= 1024 ? 4 : tablet ? 3 : 2, gutter: tablet ? 24 : 16 };
}
