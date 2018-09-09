class MyLogo {
  paint(ctx, geom, properties) {
    ctx.beginPath();
    ctx.fillStyle = 'rgba(62, 62, 62, 0.7)';
    ctx.arc(200, 300, 108, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(15, 9, 9, 1)';
    ctx.beginPath();
    ctx.arc(238, 192, 70, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(228, 3, 3, 0.6)';
    ctx.beginPath();
    ctx.arc(308, 192, 10, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 450);
    ctx.lineTo(1500, 0);
    ctx.stroke();
  }
}

registerPaint('mylogo', MyLogo);
