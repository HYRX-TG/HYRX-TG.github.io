// 雪花特效 - 来自 stellar 主题装修笔记
(function() {
    var storageKey = 'stellar_snow_enabled';
    var canvas, ctx;
    var flakes = [];
    var enabled = localStorage.getItem(storageKey) !== 'false'; // 默认开启

    function initCanvas() {
        canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '9999';
        canvas.style.display = enabled ? 'block' : 'none';
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');
        resizeCanvas();
        if (enabled) startSnow();
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createFlakes(count) {
        for (var i = 0; i < count; i++) {
            flakes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 4 + 1,
                speed: Math.random() * 1.5 + 0.3,
                opacity: Math.random() * 0.6 + 0.2
            });
        }
    }

    function drawSnow() {
        if (!ctx || !enabled) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var i = 0; i < flakes.length; i++) {
            var f = flakes[i];
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, ' + f.opacity + ')';
            ctx.fill();
            f.y += f.speed;
            if (f.y > canvas.height) {
                f.y = -f.radius;
                f.x = Math.random() * canvas.width;
            }
        }
        requestAnimationFrame(drawSnow);
    }

    function startSnow() {
        if (flakes.length === 0) createFlakes(150);
        drawSnow();
    }

    function stopSnow() {
        enabled = false;
        if (canvas) canvas.style.display = 'none';
        localStorage.setItem(storageKey, 'false');
    }

    function enableSnow() {
        enabled = true;
        if (canvas) canvas.style.display = 'block';
        localStorage.setItem(storageKey, 'true');
        if (flakes.length === 0) createFlakes(150);
        drawSnow();
    }

    window.addEventListener('resize', function() {
        resizeCanvas();
        flakes = [];
        if (enabled) createFlakes(150);
    });

    window.SnowToggle = {
        enable: enableSnow,
        disable: stopSnow,
        toggle: function() { enabled ? stopSnow() : enableSnow(); }
    };

    initCanvas();
})();