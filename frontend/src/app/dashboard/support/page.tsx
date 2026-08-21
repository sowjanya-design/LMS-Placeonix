export default function SupportPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Support</h1>
        <p className="text-sm text-muted">Get help from the Placeonix team.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <a
          href="mailto:support@placeonix.in"
          className="rounded-[14px] border border-line bg-white p-5 transition-colors hover:border-purple hover:bg-purple-lt"
        >
          <div className="mb-2 text-2xl">✉️</div>
          <div className="font-bold text-ink">Email</div>
          <div className="text-xs text-muted">support@placeonix.in</div>
        </a>
        <a
          href="tel:+919876543210"
          className="rounded-[14px] border border-line bg-white p-5 transition-colors hover:border-purple hover:bg-purple-lt"
        >
          <div className="mb-2 text-2xl">📞</div>
          <div className="font-bold text-ink">Call</div>
          <div className="text-xs text-muted">+91 99494 94020</div>
        </a>
        <div className="rounded-[14px] border border-line bg-white p-5">
          <div className="mb-2 text-2xl">🏢</div>
          <div className="font-bold text-ink">Visit</div>
          <div className="text-xs text-muted">Hyderabad, India</div>
        </div>
      </div>

      <div className="rounded-[14px] border border-line bg-white p-5">
        <div className="mb-3 text-base font-bold text-ink">Frequently Asked Questions</div>
        <div className="flex flex-col divide-y divide-line">
          {[
            ["How do I reset my password?", "Use \"Forgot Password?\" on the login screen, or ask your mentor/admin."],
            ["Where can I see my attendance?", "Attendance is in the sidebar — shows your overall % and full history."],
            ["How do I submit an assignment?", "Open Assignments, click Submit on the assignment card, and add your work/GitHub link."],
            ["Who do I contact about platform access?", "Reach out via the email or phone above, or contact your administrator."],
          ].map(([q, a]) => (
            <div key={q} className="py-3">
              <div className="text-sm font-semibold text-ink">{q}</div>
              <div className="mt-1 text-sm text-muted">{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
