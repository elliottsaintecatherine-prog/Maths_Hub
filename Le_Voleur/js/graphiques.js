// ════════════════════════════════════════════════════
// Le Voleur — FONCTIONS DE DESSIN CANVAS
// ════════════════════════════════════════════════════
'use strict';

        window.dessinerCourbe = function(canvas, func, color, showAxes) {
            var ctx = canvas.getContext('2d');
            var w = canvas.width = canvas.offsetWidth;
            var h = canvas.height = canvas.offsetHeight;

            var minX = -10, maxX = 10;
            var minY = Infinity, maxY = -Infinity;

            for(var ix = minX; ix <= maxX; ix += 1) {
                var val = func(ix);
                if(val < minY) minY = val;
                if(val > maxY) maxY = val;
            }
            if(maxY === minY) { maxY += 10; minY -= 10; }

            var rangeX = maxX - minX;
            var rangeY = maxY - minY;
            var paddingY = rangeY * 0.15;
            var effectiveMinY = minY - paddingY;
            var effectiveRangeY = (maxY + paddingY) - effectiveMinY;
            var scaleX = w / rangeX; var scaleY = h / effectiveRangeY;

            ctx.fillStyle = "#000"; ctx.fillRect(0,0,w,h);

            if(showAxes) {
                var zeroX = (0 - minX) * scaleX;
                var zeroY = h - (0 - effectiveMinY) * scaleY;

                ctx.lineWidth = 1; ctx.strokeStyle = "#1e293b";
                for(var i=minX; i<=maxX; i+=2) {
                    var x = (i - minX) * scaleX;
                    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
                }

                ctx.strokeStyle = "#475569"; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(zeroX, 0); ctx.lineTo(zeroX, h); ctx.stroke();
                if(effectiveMinY < 0 && (maxY + paddingY) > 0) {
                    ctx.beginPath(); ctx.moveTo(0, zeroY); ctx.lineTo(w, zeroY); ctx.stroke();
                } else { zeroY = h - 5; }

                ctx.fillStyle = "#94a3b8"; ctx.font = "10px 'Share Tech Mono', monospace";
                ctx.textAlign = "center"; ctx.textBaseline = "top";
                [-10, -5, 5, 10].forEach(v => {
                    var px = (v - minX) * scaleX;
                    ctx.fillText(v, px, zeroY > h - 15 ? h - 15 : zeroY + 5);
                });
                ctx.textAlign = "left"; ctx.textBaseline = "middle";
                ctx.fillText(Math.round(maxY), zeroX + 5, 10);
                ctx.fillText(Math.round(minY), zeroX + 5, h - 10);
            }

            ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 3;
            for(var x=minX; x<=maxX; x+=0.5) {
                var yVal = func(x); var plotX = (x - minX) * scaleX; var plotY = h - (yVal - effectiveMinY) * scaleY;
                if(x===minX) ctx.moveTo(plotX, plotY); else ctx.lineTo(plotX, plotY);
            }
            ctx.stroke();
        };

        window.dessinerGrilleLecture = function(canvas, func, color) {
            var ctx = canvas.getContext('2d');
            var w = canvas.width = canvas.offsetWidth;
            var h = canvas.height = canvas.offsetHeight;
            ctx.fillStyle = "#000"; ctx.fillRect(0,0,w,h);

            var min = -6; var max = 6; var range = max - min;
            var scaleX = w / range; var scaleY = h / range;

            var zeroX = (0 - min) * scaleX;
            var zeroY = h - (0 - min) * scaleY;

            ctx.font = "12px 'Share Tech Mono'"; ctx.textAlign = "center"; ctx.textBaseline = "middle";

            for(var i=min; i<=max; i++) {
                var plotX = (i - min) * scaleX;
                ctx.lineWidth = (i === 0) ? 2 : 1; ctx.strokeStyle = (i === 0) ? "#475569" : "#1e293b";
                ctx.beginPath(); ctx.moveTo(plotX, 0); ctx.lineTo(plotX, h); ctx.stroke();

                var plotY = h - (i - min) * scaleY;
                ctx.lineWidth = (i === 0) ? 2 : 1; ctx.strokeStyle = (i === 0) ? "#475569" : "#1e293b";
                ctx.beginPath(); ctx.moveTo(0, plotY); ctx.lineTo(w, plotY); ctx.stroke();

                ctx.fillStyle = "#94a3b8";
                if(i !== 0) { ctx.fillText(i, plotX, zeroY + 12); ctx.fillText(i, zeroX - 12, plotY); }
            }
            ctx.fillText("0", zeroX - 10, zeroY + 12);

            ctx.beginPath(); ctx.strokeStyle = color || "#00f3ff"; ctx.lineWidth = 3;
            for(var x_val=min; x_val<=max; x_val+=0.1) {
                var yVal = func(x_val); var plotX = (x_val - min) * scaleX; var plotY = h - (yVal - min) * scaleY;
                if(x_val===min) ctx.moveTo(plotX, plotY); else ctx.lineTo(plotX, plotY);
            }
            ctx.stroke();
        };
