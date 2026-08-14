import { motion } from "framer-motion";
import { CheckCircle2, Camera, Send, AlertCircle, X } from "lucide-react";
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
      problemCount > 0 ? `Tasks not completed: ${problemCount}` : null,
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
      color: ["#7209B7", "#B5838D", "#10b981", "#f59e0b", "#ec4899"][Math.floor(Math.random() * 5)],
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
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-background/97 backdrop-blur-xl"
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
          className="absolute top-4 right-4 z-10 h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all bg-muted border border-border"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div
          className="rounded-3xl p-6 pb-5 bg-green-500/10 border border-green-500/30"
        >
          <div className="text-center mb-5">
            <motion.div
              animate={{ rotate: [0, -8, 8, -4, 4, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 1, delay: 0.3 }}
              className="text-6xl mb-4"
            >
              🏆
            </motion.div>
            <h1 className="text-2xl font-black text-foreground font-heading">Daily Care Complete</h1>
            <p className="text-muted-foreground text-xs mt-1">{today}</p>
            {caregiverName && (
              <p className="text-foreground/70 text-sm mt-1 font-medium">{caregiverName}</p>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-2xl p-3 text-center bg-destructive/10 border border-destructive/20">
              <p className="text-xl font-black text-destructive">{criticalDone}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Critical Tasks</p>
            </div>
            <div className="rounded-2xl p-3 text-center bg-blue-500/10 border border-blue-500/20">
              <p className="text-xl font-black text-blue-500">{routineDone}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Routine Tasks</p>
            </div>
            <div className="rounded-2xl p-3 text-center bg-primary/10 border border-primary/20">
              <p className="text-xl font-black text-primary">{photoCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Proof Photos</p>
            </div>
            {problemCount > 0 ? (
              <div className="rounded-2xl p-3 text-center bg-destructive/10 border border-destructive/20">
                <p className="text-xl font-black text-destructive">{problemCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Not Completed</p>
              </div>
            ) : (
              <div className="rounded-2xl p-3 text-center bg-green-500/10 border border-green-500/20">
                <p className="text-xl font-black text-green-500">✓</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">No Problems</p>
              </div>
            )}
          </div>

          {/* Problem alert */}
          {problemCount > 0 && (
            <div
              className="rounded-2xl p-3 mb-4 flex items-start gap-2 bg-destructive/10 border border-destructive/25"
            >
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-xs text-destructive">
                <span className="font-bold">Tasks Not Completed</span> — {problemCount} task{problemCount !== 1 ? "s" : ""} could not be completed. Check the dashboard for the recorded reasons.
              </p>
            </div>
          )}

          {/* Send completion message */}
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold px-1">Completion Message Ready</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSendEmail}
              className="w-full py-3.5 rounded-2xl font-bold text-primary-foreground text-sm flex items-center justify-center gap-2 bg-primary glow-purple"
            >
              <Send className="h-4 w-4" />
              Send Completion Message
            </motion.button>
            <p className="text-[10px] text-muted-foreground text-center px-2">
              Opens your email app with a prefilled completion summary for {ownerName}
            </p>
          </div>
        </div>

        {/* Back button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onDismiss}
          className="w-full mt-3 py-3.5 rounded-2xl font-semibold text-muted-foreground text-sm border border-border bg-card"
        >
          Back to Dashboard
        </motion.button>
      </motion.div>
    </motion.div>
  );
}