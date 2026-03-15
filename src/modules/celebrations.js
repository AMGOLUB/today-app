let canvas, ctx;
let particles = [];
let animFrameId = null;

export function initCelebrations() {
  canvas = document.getElementById('confettiCanvas');
  if (canvas) {
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  // Update completion badge
  updateCompletionBadge();
}

export function allComplete() {
  fireConfetti();
}

export function streakMilestone(streak) {
  const milestones = [3, 7, 14, 30, 50, 100];
  if (milestones.includes(streak)) {
    showToast(`\uD83D\uDD25 ${streak}-day streak! Keep it up!`);
    fireConfetti();
  }
}

export function updateCompletionBadge() {
  const badge = document.getElementById('completionBadge');
  if (!badge) return;

  const history = JSON.parse(localStorage.getItem('today_completion_history') || '{}');
  const today = new Date().toISOString().split('T')[0];
  const count = history[today] || 0;

  if (count > 0) {
    badge.textContent = `${count} done today`;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function fireConfetti() {
  if (!canvas || !ctx) return;

  canvas.style.display = 'block';
  particles = [];

  const colors = ['#ef4444', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#f97316'];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 15,
      vy: Math.random() * -18 - 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      gravity: 0.3,
      opacity: 1,
      decay: Math.random() * 0.01 + 0.005,
    });
  }

  if (animFrameId) cancelAnimationFrame(animFrameId);
  animateConfetti();

  setTimeout(() => {
    canvas.style.display = 'none';
    particles = [];
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }, 3000);
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach((p) => {
    p.x += p.vx;
    p.vy += p.gravity;
    p.y += p.vy;
    p.rotation += p.rotationSpeed;
    p.opacity -= p.decay;

    if (p.opacity <= 0) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.globalAlpha = Math.max(0, p.opacity);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    ctx.restore();
  });

  particles = particles.filter((p) => p.opacity > 0);

  if (particles.length > 0) {
    animFrameId = requestAnimationFrame(animateConfetti);
  }
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'streak-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
