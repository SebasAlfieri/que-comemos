"use client";

import { useRef, useState } from "react";
import { dishLinkHref, type Dish } from "@/lib/db";

const CONTACTS = [
  { label: "Mandar a Seba", phone: "5491122251843", className: "btn--seba" },
  { label: "Mandar a Belu", phone: "5491130099706", className: "btn--belu" },
];

type Props = {
  dish: Dish;
  initialHave?: string[];
  onClose: () => void;
};

export default function DishDetail({ dish, initialHave, onClose }: Props) {
  const [have, setHave] = useState<Set<string>>(
    () => new Set(initialHave ?? [])
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteItem, setNoteItem] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const pressTimer = useRef<number | null>(null);
  const longPressRef = useRef(false);

  const toggle = (item: string) => {
    setHave((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  };

  const startPress = (item: string) => {
    longPressRef.current = false;
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
    }
    pressTimer.current = window.setTimeout(() => {
      longPressRef.current = true;
      setNoteDraft(notes[item] ?? "");
      setNoteItem(item);
    }, 600);
  };

  const clearPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleChipClick = (item: string) => {
    if (longPressRef.current) {
      longPressRef.current = false;
      return;
    }
    toggle(item);
  };

  const saveNote = () => {
    if (!noteItem) return;
    const value = noteDraft.trim();
    setNotes((prev) => {
      const next = { ...prev };
      if (value) {
        next[noteItem] = value;
      } else {
        delete next[noteItem];
      }
      return next;
    });
    setNoteItem(null);
  };

  const removeNote = () => {
    if (!noteItem) return;
    setNotes((prev) => {
      const next = { ...prev };
      delete next[noteItem];
      return next;
    });
    setNoteItem(null);
  };

  const closeNote = () => setNoteItem(null);

  const formatItem = (i: string) => (notes[i] ? `${i} (${notes[i]})` : i);

  const buildMessage = () => {
    const haveList = dish.ingredients.filter((i) => have.has(i));
    const missingList = dish.ingredients.filter((i) => !have.has(i));
    const lines = [`Lista de compras para «${dish.name}»`, ""];
    if (haveList.length > 0) {
      lines.push("*Ya tenemos:*");
      haveList.forEach((i) => lines.push(`• ${formatItem(i)} ✅`));
      lines.push("");
    }
    lines.push("*Falta comprar:*");
    missingList.forEach((i) => lines.push(`• ${formatItem(i)} ❌`));
    return lines.join("\n");
  };

  const sendWhatsApp = (phone: string) => {
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(buildMessage())}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={dish.name}
      >
        <div className="drawer-header">
          <h2 className="drawer-title">{dish.name}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {dish.link && (
          <a
            className="btn btn--ghost btn--block"
            style={{ marginBottom: 12 }}
            href={dishLinkHref(dish.link)}
            target="_blank"
            rel="noreferrer"
          >
            <span className="chip-play">
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            Ver video
          </a>
        )}

        <div className="field">
          <label className="field-label">¿Qué ya tenemos?</label>
          {dish.ingredients.length > 0 && (
            <p className="field-hint">
              Mantené apretado un ingrediente para agregar nota.
            </p>
          )}
          <div className="chips">
            {dish.ingredients.length === 0 && (
              <p className="field-hint">Este platillo no tiene ingredientes.</p>
            )}
            {dish.ingredients.map((item) => (
              <span key={item} className="chip-cell">
                <button
                  type="button"
                  className={`chip chip-btn${have.has(item) ? " chip--have" : ""}`}
                  onClick={() => handleChipClick(item)}
                  onPointerDown={() => startPress(item)}
                  onPointerUp={clearPress}
                  onPointerLeave={clearPress}
                  onPointerCancel={clearPress}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-pressed={have.has(item)}
                >
                  {item}
                </button>
                <span className="chip-note-row">
                  {notes[item] && <span className="chip-note">{notes[item]}</span>}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="btn-row" style={{ marginTop: 30 }}>
          {CONTACTS.map((contact) => (
            <button
              key={contact.phone}
              type="button"
              className={`btn ${contact.className}`}
              onClick={() => sendWhatsApp(contact.phone)}
            >
              {contact.label}
            </button>
          ))}
        </div>
      </div>

      {noteItem && (
        <div className="modal-backdrop" onClick={closeNote}>
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-label={`Nota para ${noteItem}`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="modal-title">Nota para «{noteItem}»</p>
            <p className="modal-text">
              Agregá una nota para este ingrediente en la lista de compras.
            </p>
            <input
              className="input"
              type="text"
              placeholder="300g"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") saveNote();
              }}
            />
            <div className="modal-actions" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="btn btn--danger"
                onClick={removeNote}
              >
                Eliminar
              </button>
              <button
                type="button"
                className="btn btn--accent"
                onClick={saveNote}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
