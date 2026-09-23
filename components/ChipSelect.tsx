"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { keyOf } from "@/lib/db";

type Props = {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  onCreate?: (name: string) => Promise<void> | void;
  onlyMarks?: boolean;
};

export default function ChipSelect({
  options,
  selected,
  onChange,
  placeholder = "Buscar…",
  onCreate,
  onlyMarks = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedSet = useMemo(
    () => new Set(selected.map(keyOf)),
    [selected]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLocaleLowerCase().includes(q));
  }, [options, query]);

  const exactMatch = useMemo(
    () => options.some((o) => keyOf(o) === keyOf(query)),
    [options, query]
  );

  const toggle = (value: string) => {
    const key = keyOf(value);
    const exists = selected.find((s) => keyOf(s) === key);
    onChange(exists ? selected.filter((s) => s !== exists) : [...selected, value]);
  };

  const mark = (value: string) => {
    if (!selected.some((s) => keyOf(s) === keyOf(value))) {
      onChange([...selected, value]);
    }
  };

  const createIngredient = () => {
    const raw = query.trim();
    if (pending || !onCreate || !raw) return;
    setPending(true);
    const result = onCreate(raw);
    if (result instanceof Promise) {
      result
        .then(() => setQuery(""))
        .catch(() => window.alert("No se pudo agregar. Revisá la conexión."))
        .finally(() => {
          setPending(false);
          requestAnimationFrame(() => inputRef.current?.focus());
        });
    } else {
      setQuery("");
      setPending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const raw = query.trim();
    if (!raw) return;
    e.preventDefault();

    const target =
      options.find((o) => keyOf(o) === keyOf(raw)) ?? filtered[0];
    if (target) {
      mark(target);
      setQuery("");
      return;
    }
    createIngredient();
  };

  const showCreate =
    onCreate && query.trim().length > 0 && !exactMatch;

  const topMatch = useMemo(() => {
    const raw = query.trim();
    if (!raw) return null;
    return (
      options.find((o) => keyOf(o) === keyOf(raw)) ?? filtered[0] ?? null
    );
  }, [options, filtered, query]);

  const ghostSuffix = useMemo(() => {
    const top = topMatch;
    const raw = query.trim();
    if (!top || !raw) return "";
    if (top.toLocaleLowerCase().startsWith(raw.toLocaleLowerCase())) {
      return top.slice(raw.length);
    }
    return "";
  }, [topMatch, query]);

  const selectedNames = options.filter((o) => selectedSet.has(keyOf(o)));
  const suggestions = filtered.filter((o) => !selectedSet.has(keyOf(o)));

  const list = onlyMarks
    ? query.trim()
      ? [...selectedNames, ...suggestions]
      : selectedNames
    : filtered;
  const showEmptyHint = onlyMarks
    ? list.length === 0
    : filtered.length === 0 && !showCreate;

  return (
    <div>
      <div className="search-ghost-wrap">
        {ghostSuffix && (
          <span className="search-ghost" aria-hidden="true">
            {query}
            <b>{ghostSuffix}</b>
          </span>
        )}
        <input
          ref={inputRef}
          className="search search--ghost"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          inputMode="text"
          autoComplete="off"
          disabled={pending}
        />
      </div>

      <div className="chips">
        {list.map((option) => {
          const selectedChip = selectedSet.has(keyOf(option));
          return (
            <button
              key={keyOf(option)}
              type="button"
              className={`chip${selectedChip ? " chip--selected" : ""}`}
              onClick={() => toggle(option)}
              aria-pressed={selectedChip}
            >
              {option}
            </button>
          );
        })}
        {showCreate && (
          <button
            type="button"
            className="chip chip-create"
            onClick={createIngredient}
            disabled={pending}
          >
            {pending ? (
              <>
                <span className="spinner spinner--sm" aria-hidden="true" />
                Agregando…
              </>
            ) : (
              `+ Crear «${query.trim()}»`
            )}
          </button>
        )}
        {showEmptyHint && (
          <span className="empty-inline">
            {onlyMarks && query.trim().length === 0
              ? "Escribí para buscar ingredientes…"
              : "Sin resultados"}
          </span>
        )}
      </div>
    </div>
  );
}