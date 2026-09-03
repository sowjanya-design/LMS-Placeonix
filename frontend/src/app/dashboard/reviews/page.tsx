"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import {
  Field,
  Textarea,
  Select,
  DangerButton,
  SecondaryButton,
  ErrorText,
  ModalActions,
} from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";

// The list endpoint returns raw Review docs, so `response` is the embedded
// sub-document ({ text, respondedBy, respondedAt }), not a string.
type TargetType = "mentor" | "course" | "batch" | "institute";

interface ReviewRow {
  _id: string;
  student?: { _id?: string; firstName?: string; lastName?: string };
  targetType: TargetType;
  target: string;
  rating: number;
  title?: string;
  comment?: string;
  createdAt: string;
  response?: { text?: string; respondedAt?: string };
}

// Only the fields myEnrollments populates that we can turn into review targets.
interface EnrollmentLite {
  _id: string;
  course?: { _id: string; title?: string };
  batch?: {
    _id: string;
    name?: string;
    mentor?: { _id: string; firstName?: string; lastName?: string };
  };
}

interface TargetOption {
  targetType: TargetType;
  id: string;
  label: string;
}

const TYPE_LABEL: Record<TargetType, string> = {
  mentor: "Mentor",
  course: "Course",
  batch: "Batch",
  institute: "Institute",
};

function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber">
      {"★".repeat(n)}
      {"☆".repeat(5 - n)}
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Turn the student's enrollments into a de-duplicated list of review targets.
// Institute is intentionally excluded: the controller requires a MongoId
// `target` and enrollments expose no institute id.
function buildTargetOptions(enrollments: EnrollmentLite[]): TargetOption[] {
  const map = new Map<string, TargetOption>();
  for (const e of enrollments) {
    if (e.course?._id) {
      map.set(`course:${e.course._id}`, {
        targetType: "course",
        id: e.course._id,
        label: e.course.title ?? "Course",
      });
    }
    if (e.batch?._id) {
      map.set(`batch:${e.batch?._id}`, {
        targetType: "batch",
        id: e.batch?._id,
        label: e.batch?.name ?? "Batch",
      });
    }
    const m = e.batch?.mentor;
    if (m?._id) {
      map.set(`mentor:${m._id}`, {
        targetType: "mentor",
        id: m._id,
        label: `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "Mentor",
      });
    }
  }
  return [...map.values()];
}

function FeedbackModal({
  options,
  onClose,
  onDone,
}: {
  options: TargetOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const types = useMemo(
    () =>
      (["mentor", "course", "batch", "institute"] as TargetType[]).filter((t) =>
        options.some((o) => o.targetType === t),
      ),
    [options],
  );
  const [targetType, setTargetType] = useState<TargetType>(
    types[0] ?? "course",
  );
  const [target, setTarget] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const typeOptions = useMemo(
    () => options.filter((o) => o.targetType === targetType),
    [options, targetType],
  );

  // Keep `target` valid whenever the chosen type (and thus its options) changes.
  useEffect(() => {
    setTarget(typeOptions[0]?.id ?? "");
  }, [typeOptions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) {
      setError("Choose what you're reviewing");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/reviews", {
        targetType,
        target,
        rating,
        comment: comment.trim() || undefined,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to submit feedback",
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Leave feedback" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="What are you reviewing?" required>
          <Select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as TargetType)}
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={TYPE_LABEL[targetType]} required>
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            {typeOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Rating" required>
          <Select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)}
                {"☆".repeat(5 - n)} — {n}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Comment" hint="Optional">
          <Textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience…"
          />
        </Field>

        <ErrorText>{error}</ErrorText>
        <ModalActions
          onCancel={onClose}
          submitting={submitting}
          submitLabel="Submit feedback"
          disabled={!target}
        />
      </form>
    </Modal>
  );
}

function RespondModal({
  review,
  onClose,
  onDone,
}: {
  review: ReviewRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [text, setText] = useState(review.response?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("Response cannot be empty");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/reviews/${review._id}/respond`, { text: text.trim() });
      onDone();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save response",
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Respond to review" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="rounded-lg bg-bg p-3 text-sm text-ink2">
          <Stars n={review.rating} />
          {review.comment && (
            <p className="mt-1 text-muted">{review.comment}</p>
          )}
        </div>
        <Field label="Your response" required>
          <Textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reply to this review…"
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <ModalActions
          onCancel={onClose}
          submitting={submitting}
          submitLabel="Post response"
          disabled={!text.trim()}
        />
      </form>
    </Modal>
  );
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<TargetOption[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [respondTo, setRespondTo] = useState<ReviewRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    api
      .get<ReviewRow[]>("/reviews?limit=100")
      .then(setReviews)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load reviews",
        ),
      );
  }

  useEffect(load, []);

  // Students need their enrollments to know what they're allowed to review.
  useEffect(() => {
    if (user?.role !== "student") return;
    api
      .get<EnrollmentLite[]>("/users/me/enrollments")
      .then((e) => setOptions(buildTargetOptions(e)))
      .catch(() => setOptions([]));
  }, [user?.role]);

  async function handleDelete(r: ReviewRow) {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    setDeletingId(r._id);
    try {
      await api.delete(`/reviews/${r._id}`);
      setReviews((prev) => (prev ? prev.filter((x) => x._id !== r._id) : prev));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to delete review",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const avg =
    reviews && reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;
  const canLeaveFeedback = user?.role === "student" && options.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">
            {user?.role === "student" ? "Feedback" : "Reviews"}
          </h1>
          <p className="text-sm text-muted">
            {avg
              ? `Average rating ${avg} from ${reviews?.length} reviews`
              : "Student feedback."}
          </p>
        </div>
        {canLeaveFeedback && (
          <button
            onClick={() => setShowFeedback(true)}
            className="rounded-[10px] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(108,63,245,0.28)]"
            style={{
              background:
                "linear-gradient(135deg, var(--purple), var(--purple-dk))",
            }}
          >
            Leave feedback
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {reviews && (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => {
            const canRespond =
              user?.role === "admin" ||
              (user?.role === "mentor" &&
                r.targetType === "mentor" &&
                r.target === user?._id);
            const canDelete =
              user?.role === "admin" ||
              (user?.role === "student" && r.student?._id === user?._id);
            return (
              <div
                key={r._id}
                className="rounded-[14px] border border-line bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-ink">
                    {r.student?.firstName} {r.student?.lastName}
                  </div>
                  <Stars n={r.rating} />
                </div>
                {r.title && (
                  <div className="mt-1 text-sm font-semibold text-ink2">
                    {r.title}
                  </div>
                )}
                {r.comment && (
                  <p className="mt-1 text-sm text-muted">{r.comment}</p>
                )}
                <div className="mt-2 text-xs text-muted">
                  {r.targetType} · {fmt(r.createdAt)}
                </div>
                {r.response?.text && (
                  <p className="mt-2 rounded-lg bg-bg p-3 text-sm text-ink2">
                    <span className="font-semibold text-ink">Response: </span>
                    {r.response.text}
                  </p>
                )}
                {(canRespond || canDelete) && (
                  <div className="mt-3 flex justify-end gap-2">
                    {canRespond && (
                      <SecondaryButton
                        type="button"
                        onClick={() => setRespondTo(r)}
                      >
                        {r.response?.text ? "Edit response" : "Respond"}
                      </SecondaryButton>
                    )}
                    {canDelete && (
                      <DangerButton
                        type="button"
                        disabled={deletingId === r._id}
                        onClick={() => handleDelete(r)}
                      >
                        {deletingId === r._id ? "Deleting…" : "Delete"}
                      </DangerButton>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {reviews.length === 0 && <EmptyState message="No reviews yet." />}
        </div>
      )}

      {showFeedback && (
        <FeedbackModal
          options={options}
          onClose={() => setShowFeedback(false)}
          onDone={load}
        />
      )}
      {respondTo && (
        <RespondModal
          review={respondTo}
          onClose={() => setRespondTo(null)}
          onDone={load}
        />
      )}
    </div>
  );
}
