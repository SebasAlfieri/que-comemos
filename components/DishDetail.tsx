"use client";

import { useRef, useState } from "react";
import { dishLinkHref, type Dish } from "@/lib/db";

const CONTACTS = [
  { label: "Enviar a Axel", phone: "5491173630573", className: "btn--axel" },
  { label: "Enviar a Luchi", phone: "5491170661086", className: "btn--luchi" },
];

type Props = {
  dish: Dish;
  initialHave?: string[];
  onClose: () => void;
};

export default function DishDetail({ dish, initialHave, onClose }: Props) {
  const [have, setHave] = useState<Set<string>>(
    () => new Set(initialHave ?? []),
  );
  const [notes, setNotes] = useState<Record<string, string>>(() => ({
    ...(dish.notes ?? {}),
  }));
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
    const lines = [`Lista de compras para ${dish.name}`, ""];
    if (haveList.length > 0) {
      lines.push("*Ya tenemos:*");
      haveList.forEach((i) => lines.push(`• ${formatItem(i)} ✅`));
      lines.push("");
    }
    lines.push("*Falta comprar:*");
    missingList.forEach((i) => lines.push(`• ${formatItem(i)} ❌`));
    return lines.join("\n");
  };

  const sendWhatsApp = (phone?: string) => {
    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(buildMessage())}`
      : `https://wa.me/?text=${encodeURIComponent(buildMessage())}`;
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
            <p className="field-hint field-hint--note">
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
                  {notes[item] && (
                    <span className="chip-note">{notes[item]}</span>
                  )}
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

        <div className="btn-row" style={{ marginTop: 40 }}>
          <button
            type="button"
            className="btn btn--wsp btn--block"
            onClick={() => sendWhatsApp()}
          >
            <span className="chip-play">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.17-1.35a9.9 9.9 0 0 0 4.87 1.24h.01c5.5 0 9.96-4.46 9.96-9.96 0-2.66-1.03-5.16-2.91-7.04A9.9 9.9 0 0 0 12.04 2zm0 1.82c2.16 0 4.2.85 5.73 2.38a8.05 8.05 0 0 1 2.37 5.76c0 4.47-3.63 8.1-8.1 8.1a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.07.8.82-3-.19-.31a8.04 8.04 0 0 1-1.24-4.29c0-4.47 3.63-8.1 8.1-8.1zm-2.6 4.1c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.34.99 2.5c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.05.14-1.16-.06-.1-.22-.16-.46-.28-.24-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2a7.3 7.3 0 0 1-1.34-1.68c-.14-.24-.02-.37.1-.5.11-.1.25-.28.37-.42.13-.14.17-.24.25-.4.09-.16.05-.3-.02-.42-.06-.12-.55-1.34-.76-1.83-.2-.48-.4-.41-.55-.42h-.47z" />
              </svg>
            </span>
            Mandar por WhatsApp
          </button>
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
            <p className="modal-title">Nota para <u>{noteItem}</u></p>
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
