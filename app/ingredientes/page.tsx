"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addIngredient,
  deleteIngredient,
  describeFirestoreError,
  keyOf,
  renameIngredient,
  watchDishes,
  watchIngredients,
  type Dish,
  type Ingredient,
} from "@/lib/db";

export default function IngredientesPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"alpha" | "usage">("alpha");

  useEffect(() => {
    const unIngredients = watchIngredients(
      (items) => {
        setIngredients(items);
        setLoading(false);
      },
      (err) => {
        setError(describeFirestoreError(err));
        setLoading(false);
      }
    );
    const unDishes = watchDishes(
      (items) => {
        setDishes(items);
        setLoading(false);
      },
      (err) => {
        setError(describeFirestoreError(err));
        setLoading(false);
      }
    );
    return () => {
      unIngredients();
      unDishes();
    };
  }, []);

  const usage = (ingredientId: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing) return 0;
    return dishes.filter((d) =>
      d.ingredients.some(
        (n) => n.toLocaleLowerCase() === ing.name.toLocaleLowerCase()
      )
    ).length;
  };

  const queryLower = newName.trim().toLocaleLowerCase();
  const exactExists =
    newName.trim().length > 0 &&
    ingredients.some((i) => keyOf(i.name) === keyOf(newName));

  const visible = useMemo(() => {
    const counts = new Map<string, number>();
    for (const dish of dishes) {
      for (const name of dish.ingredients) {
        const k = keyOf(name);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    const base = queryLower
      ? ingredients.filter((i) =>
          i.name.toLocaleLowerCase().includes(queryLower)
        )
      : ingredients;
    return [...base].sort((a, b) => {
      if (sortMode === "usage") {
        const diff =
          (counts.get(keyOf(b.name)) ?? 0) - (counts.get(keyOf(a.name)) ?? 0);
        if (diff !== 0) return diff;
      }
      return a.name.localeCompare(b.name, "es");
    });
  }, [ingredients, dishes, queryLower, sortMode]);

  const handleAdd = async () => {
    if (adding || !newName.trim()) return;
    setAdding(true);
    try {
      const result = await addIngredient(newName);
      if (result?.created) setNewName("");
    } catch {
      window.alert("No se pudo agregar. Revisá la conexión.");
    } finally {
      setAdding(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const [renaming, setRenaming] = useState<Ingredient | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const openRename = (item: Ingredient) => {
    setRenaming(item);
    setRenameName(item.name);
    setRenameError(null);
    setRenameSaving(false);
  };

  const closeRename = () => {
    if (renameSaving) return;
    setRenaming(null);
    inputRef.current?.focus();
  };

  const handleRenameSave = async () => {
    if (!renaming || renameSaving) return;
    const trimmed = renameName.trim();
    if (!trimmed) {
      setRenameError("Poné el nombre nuevo.");
      return;
    }
    if (trimmed.toLocaleLowerCase() === renaming.name.toLocaleLowerCase()) {
      closeRename();
      return;
    }
    setRenameSaving(true);
    setRenameError(null);
    try {
      await renameIngredient(renaming.id, renaming.name, trimmed, dishes);
      setRenaming(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch {
      setRenameError("No se pudo renombrar. Revisá la conexión.");
      setRenameSaving(false);
    }
  };

  const handleDelete = async (item: Ingredient) => {
    const count = usage(item.id);
    const msg =
      count > 0
        ? `«${item.name}» se usa en ${count} platillo${count === 1 ? "" : "s"} y se va a quitar de ahí también. ¿Eliminar?`
        : `¿Eliminar «${item.name}»?`;
    if (!window.confirm(msg)) return;
    try {
      await deleteIngredient(item.id, item.name, dishes);
    } catch {
      window.alert("No se pudo eliminar. Revisá la conexión.");
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" aria-hidden="true" />
        Cargando ingredientes…
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Ingredientes 🧅</h1>
        <p className="page-subtitle">
          Alimentos disponibles para armar los platillos.
        </p>
      </header>

      <div className="input-row" style={{ display: "flex", gap: "8px", margin: "16px 0" }}>
        <input
          ref={inputRef}
          className="input"
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder={adding ? "Agregando…" : "Ej: cebolla, arroz, queso…"}
          disabled={adding}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn btn--accent"
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
        >
          {adding ? (
            <span className="spinner spinner--sm" aria-hidden="true" />
          ) : (
            "+"
          )}
        </button>
      </div>

      {error && (
        <div className="error-box">
          <p className="error-box-title">⚠️ Sin conexión a la base</p>
          <p>Revisá que Firestore esté habilitado en Firebase Console.</p>
        </div>
      )}

      {newName.trim().length > 0 && (
        <p className="field-hint">
          {exactExists
            ? `«${newName.trim()}» ya existe — se marca abajo.`
            : visible.length === 0
              ? `No existe «${newName.trim()}». Enter para agregarlo como nuevo.`
              : `${visible.length} coincidencia${visible.length === 1 ? "" : "s"}. Enter agrega solo si el nombre exacto no existe.`}
        </p>
      )}

      <div
        className="sort-row"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          margin: "12px 0 8px",
        }}
      >
        <div className="chips" style={{ margin: 0 }}>
          <button
            type="button"
            className={`chip${sortMode === "alpha" ? " chip--selected" : ""}`}
            onClick={() => setSortMode("alpha")}
            aria-pressed={sortMode === "alpha"}
          >
            A → Z
          </button>
          <button
            type="button"
            className={`chip${sortMode === "usage" ? " chip--selected" : ""}`}
            onClick={() => setSortMode("usage")}
            aria-pressed={sortMode === "usage"}
          >
            Más usados
          </button>
        </div>
      </div>

      {ingredients.length === 0 && !error ? (
        <div className="empty">
          <span className="empty-icon">🏷️</span>
          <p className="empty-title">Sin ingredientes</p>
          <p>Agregá arriba los ingredientes que suelen estar en tu cocina.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">🧅</span>
          <p className="empty-title">Sin coincidencias</p>
          <p>Probá con otro texto o agregalo como nuevo con Enter.</p>
        </div>
      ) : (
        visible.map((item) => {
          const isExact =
            queryLower.length > 0 &&
            keyOf(item.name) === keyOf(newName);
          return (
            <article
              key={item.id}
              className={`list-item${isExact ? " list-item--match" : ""}`}
            >
              <div className="list-item-name">{item.name}</div>
              <span className="count-pill">
                {usage(item.id)} platillo{usage(item.id) === 1 ? "" : "s"}
              </span>
              <div className="actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => openRename(item)}
                  aria-label={`Renombrar ${item.name}`}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => handleDelete(item)}
                  aria-label={`Eliminar ${item.name}`}
                >
                  🗑️
                </button>
              </div>
            </article>
          );
        })
      )}

      {renaming && (
        <>
          <div className="drawer-backdrop" onClick={closeRename} />
          <div className="drawer" role="dialog" aria-label="Renombrar ingrediente">
            <div className="drawer-header">
              <h2 className="drawer-title">Renombrar ingrediente</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={closeRename}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="ingredient-rename">
                Nuevo nombre
              </label>
              <input
                id="ingredient-rename"
                className="input"
                type="text"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRenameSave()}
                disabled={renameSaving}
                autoFocus
              />
            </div>
            {renameError && <p className="form-error">{renameError}</p>}
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--accent btn--block"
                onClick={handleRenameSave}
                disabled={renameSaving}
              >
                {renameSaving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}