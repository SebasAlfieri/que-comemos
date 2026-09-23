"use client";

import { useState } from "react";
import ChipSelect from "@/components/ChipSelect";
import {
  addIngredient,
  deleteDish,
  dishLinkHref,
  saveDish,
  type Ingredient,
  type Dish,
} from "@/lib/db";

type Props = {
  initial: Dish | null;
  ingredients: Ingredient[];
  onClose: () => void;
};

export default function DishForm({ initial, ingredients, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  const [selected, setSelected] = useState<string[]>(initial?.ingredients ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const confirmDelete = async () => {
    if (!initial) return;
    setSaving(true);
    try {
      await deleteDish(initial.id);
      onClose();
    } catch {
      setError("No se pudo eliminar. Revisá la conexión.");
      setSaving(false);
    }
  };

  const handleCreateIngredient = async (raw: string) => {
    const result = await addIngredient(raw);
    if (result) {
      setSelected((prev) =>
        prev.some((s) => s.toLowerCase() === result.name.toLowerCase())
          ? prev
          : [...prev, result.name]
      );
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Poné un nombre para el platillo.");
      return;
    }
    if (selected.length === 0) {
      setError("Agregá al menos un ingrediente.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveDish(initial?.id ?? null, name, selected, link);
      onClose();
    } catch {
      setError("No se pudo guardar. Revisá la conexión.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer" role="dialog" aria-label="Nuevo platillo">
        <div className="drawer-header">
          <h2 className="drawer-title">
            {initial ? "Editar platillo" : "Nuevo platillo"}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="dish-name">
            Nombre
          </label>
          <input
            id="dish-name"
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Milanesa con papas"
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="dish-link">
            Link (opcional)
          </label>
          <div
            className="link-row"
            style={{ display: "flex", gap: "8px" }}
          >
            <input
              id="dish-link"
              className="input"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://…"
              style={{ flex: 1 }}
            />
            {link.trim().length > 0 && (
              <a
                className="link-open"
                href={dishLinkHref(link)}
                target="_blank"
                rel="noreferrer"
                title="Abrir link"
                aria-label="Abrir link"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7" />
                  <path d="M8 7h9v9" />
                </svg>
              </a>
            )}
          </div>
        </div>

        <div className="field">
          <label className="field-label">
            Ingredientes{selected.length > 0 && ` · ${selected.length}`}
          </label>
          <ChipSelect
            options={ingredients.map((i) => i.name)}
            selected={selected}
            onChange={setSelected}
            placeholder="Buscar o crear ingrediente…"
            onCreate={handleCreateIngredient}
            onlyMarks
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="btn-row" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="btn btn--accent btn--block"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>

        {initial && (
          <button
            type="button"
            className="btn btn--danger btn--block"
            onClick={() => setConfirmOpen(true)}
            disabled={saving}
          >
            Eliminar platillo
          </button>
        )}
      </div>

      {confirmOpen && initial && (
        <div
          className="modal-backdrop"
          onClick={() => !saving && setConfirmOpen(false)}
        >
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-label="Eliminar platillo"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="modal-title">¿Eliminar «{initial.name}»?</p>
            <p className="modal-text">Esta acción no se puede deshacer.</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--danger-solid"
                onClick={confirmDelete}
                disabled={saving}
              >
                {saving ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}