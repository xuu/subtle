class MyLogo {
  paint(ctx, size) {
    const x0 = size.width / 2;
    const y0 = size.height / 2;

    ctx.beginPath();
    ctx.fillStyle = 'rgba(62, 62, 62, 0.7)';
    ctx.arc(x0, y0, 108, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(15, 9, 9, 1)';
    ctx.beginPath();
    ctx.arc(x0 + 38, y0 - 108, 70, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(228, 3, 3, 0.6)';
    ctx.beginPath();
    ctx.arc(x0 + 108, y0 - 108, 10, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x0 - 200, y0 + 150);
    ctx.lineTo(x0 + 3000, y0 - 800);
    ctx.stroke();
  }
}

registerPaint('MyLogo', MyLogo);
