import { motion } from "framer-motion";
import { CheckCircle2, Camera, Lock, Unlock, Send, AlertCircle, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { format } from "date-fns";

export default function DailySummaryScreen({
  totalTasks,
  doneTasks,
  criticalDone,
  routineDone,
  problemCount,
  photoCount,
  payConfig,
  caregiverName,
  onDismiss,
}) {
  const canvasRef = useRef();
  const ownerEmail = payConfig?.owner_email || "jthompson429@gmail.com";
  const ownerName = payConfig?.owner_name || "Owner";
  const today = format(new Date(), "MMMM d, yyyy");

  // Build the completion message body
  const buildMessage = () => {
    const lines = [
      `PurrfectDaily — Daily Care Complete`,
      `Date: ${today}`,
      caregiverName ? `Caregiver: ${caregiverName}` : null,
      ``,
      `CARE SUMMARY`,
      `Critical tasks completed: ${criticalDone}`,
      `Routine tasks completed: ${routineDone}`,
      `Proof photos submitted: ${photoCount}`,
      problemCount > 0 ? `Reported problems: ${problemCount}` : null,
      ``,
      `Daily care is complete. All required tasks have been completed and proof photos have been submitted where required.`,
    ].filter(l => l !== null).join("\n");
    return lines;
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent("PurrfectDaily: Daily care complete — payment unlocked");
    const body = encodeURIComponent(buildMessage());
    const mailto = `mailto:${ownerEmail}?subject=${subject}&body=${body}`;
    window.open(mailto, "_blank");
  };

  const handleSendSMS = () => {
    const body = encodeURIComponent(
      `PurrfectDaily ✓ Daily care complete for ${today}. ` +
      `${criticalDone} critical + ${routineDone} routine tasks done. ` +
      `${photoCount} photos.` +
      (problemCount > 0 ? ` ⚠️ ${problemCount} problem(s) reported.` : "")
    );
    window.open(`sms:${ownerEmail.includes("@") ? "" : ownerEmail}?body=${body}`, "_blank");
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: -20,
      r: Math.random() * 5 + 2,
      d: Math.random() * 80 + 10,
      color: ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ec4899"][Math.floor(Math.random() * 5)],
      tilt: Math.random() * 10 - 5,
      tiltAngle: 0,
      tiltAngleInc: Math.random() * 0.07 + 0.05,
    }));

    let frame;
    let angle = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.01;
      pieces.forEach((p) => {
        p.tiltAngle += p.tiltAngleInc;
        p.y += (Math.cos(angle + p.d) + 1.5) * 1.5;
        p.x += Math.sin(angle) * 1.5;
        p.tilt = Math.sin(p.tiltAngle - p.d / 3) * 12;
        if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
        ctx.stroke();
      });
      frame = requestAnimationFrame(draw);
    };
    draw();
    const timeout = setTimeout(() => cancelAnimationFrame(frame), 4000);
    return () => { cancelAnimationFrame(frame); clearTimeout(timeout); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      style={{ background: "rgba(10,10,15,0.97)", backdropFilter: "blur(20px)" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <motion.div
        initial={{ scale: 0.92, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 220 }}
        className="relative w-full max-w-sm overflow-y-auto"
        style={{ maxHeight: "92vh" }}
      >
        {/* Close */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 z-10 h-8 w-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 transition-all"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div
          className="rounded-3xl p-6 pb-5"
          style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
        >
          <div className="text-center mb-5">
            <motion.div
              animate={{ rotate: [0, -8, 8, -4, 4, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 1, delay: 0.3 }}
              className="text-6xl mb-4"
            >
              🏆
            </motion.div>
            <h1 className="text-2xl font-black text-white">Daily Care Complete</h1>
            <p className="text-white/40 text-xs mt-1">{today}</p>
            {caregiverName && (
              <p className="text-white/50 text-sm mt-1 font-medium">{caregiverName}</p>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-2xl p-3 text-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="text-xl font-black text-red-400">{criticalDone}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Critical Tasks</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p className="text-xl font-black text-blue-400">{routineDone}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Routine Tasks</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
              <p className="text-xl font-black text-purple-400">{photoCount}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Proof Photos</p>
            </div>
            {problemCount > 0 ? (
              <div className="rounded-2xl p-3 text-center" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="text-xl font-black text-red-400">{problemCount}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Problems Reported</p>
              </div>
            ) : (
              <div className="rounded-2xl p-3 text-center" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <p className="text-xl font-black text-green-400">✓</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">No Problems</p>
              </div>
            )}
          </div>

          {/* Problem alert */}
          {problemCount > 0 && (
            <div
              className="rounded-2xl p-3 mb-4 flex items-start gap-2"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
            >
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-300">
                <span className="font-bold">Reported Problems</span> — {problemCount} task{problemCount !== 1 ? "s" : ""} had issues. Check the dashboard for details.
              </p>
            </div>
          )}

          {/* Send completion message */}
          <div className="space-y-2">
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold px-1">Completion Message Ready</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSendEmail}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
                boxShadow: "0 0 25px rgba(124,58,237,0.35)",
              }}
            >
              <Send className="h-4 w-4" />
              Send Completion Message
            </motion.button>
            <p className="text-[10px] text-white/25 text-center px-2">
              Opens your email app with a prefilled completion summary for {ownerName}
            </p>
          </div>
        </div>

        {/* Back button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onDismiss}
          className="w-full mt-3 py-3.5 rounded-2xl font-semibold text-white/50 text-sm border"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          Back to Dashboard
        </motion.button>
      </motion.div>
    </motion.div>
  );
}