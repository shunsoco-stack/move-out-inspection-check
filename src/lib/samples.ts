import type { SampleSpec } from "./seed.ts";
import type { Photo } from "./types.ts";

export function drawSample(spec: SampleSpec): Photo {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 560;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("サンプル画像を描画できません。");
  ctx.fillStyle = spec.tone;
  ctx.fillRect(0, 0, 800, 560);
  const offset = spec.detail * 2;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff65";
  if (spec.kind === "floor") {
    for (let y = 0; y < 560; y += 83) {
      ctx.strokeRect(-60 + offset, y, 370, 83);
      ctx.strokeRect(310 + offset, y, 490, 83);
    }
    ctx.strokeStyle = "#6a5143";
    ctx.lineWidth = 5;
    for (let stroke = 0; stroke < 5; stroke++) {
      ctx.beginPath();
      ctx.moveTo(220 + offset / 3 + stroke * 20, 200 + stroke * 14);
      ctx.lineTo(360 + offset / 2 + stroke * 19, 310 + stroke * 9);
      ctx.stroke();
    }
  } else if (spec.kind === "wall") {
    ctx.fillStyle = "#ffffff3a";
    ctx.fillRect(70 + offset, 70, 240, 340);
    ctx.fillStyle = "#8b724530";
    ctx.fillRect(0, 440, 800, 120);
    ctx.strokeStyle = "#806e5b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(210 + offset, 160);
    ctx.lineTo(240 + offset, 190);
    ctx.lineTo(220 + offset, 240);
    ctx.stroke();
  } else if (spec.kind === "mold") {
    for (let x = 0; x < 800; x += 120)
      for (let y = 0; y < 560; y += 110) ctx.strokeRect(x, y, 120, 110);
    ctx.fillStyle = "#53686b";
    if (spec.detail)
      for (let dot = 0; dot < 26; dot++) {
        ctx.beginPath();
        ctx.ellipse(
          180 + dot * 13,
          320 + Math.sin(dot * 2) * 25,
          3 + dot / 7,
          5,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    ctx.strokeStyle = "#f6f7f6";
    ctx.lineWidth = 22;
    ctx.strokeRect(65, 45, 670, 460);
  } else {
    ctx.strokeStyle = "#64766d80";
    ctx.lineWidth = 1;
    for (let x = 0; x < 800; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 560);
      ctx.stroke();
    }
    for (let y = 0; y < 560; y += 15) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(800, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#f0eee3";
    ctx.lineWidth = 28;
    ctx.strokeRect(45, 35, 710, 490);
    if (spec.detail) {
      ctx.fillStyle = "#445c56";
      ctx.beginPath();
      ctx.moveTo(330 + offset, 300);
      ctx.lineTo(380 + offset, 270);
      ctx.lineTo(350 + offset, 400);
      ctx.closePath();
      ctx.fill();
    }
  }
  const light = ctx.createLinearGradient(0, 0, 800, 560);
  light.addColorStop(0, "#ffffff35");
  light.addColorStop(1, "#142c3025");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, 800, 560);
  ctx.fillStyle = "#ffffffde";
  ctx.fillRect(620, 510, 165, 35);
  ctx.font = '20px "Yu Gothic", sans-serif';
  ctx.fillStyle = "#394a44";
  ctx.fillText("サンプル画像", 637, 535);
  return {
    id: spec.id,
    inspectionId: spec.inspectionId,
    roomId: spec.roomId,
    itemId: spec.itemId,
    label: spec.label,
    takenAt: spec.takenAt,
    data: canvas.toDataURL("image/jpeg", 0.8),
  };
}
