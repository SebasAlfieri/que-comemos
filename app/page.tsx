"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ChipSelect from "@/components/ChipSelect";
import {
  describeFirestoreError,
  keyOf,
  watchDishes,
  watchIngredients,
  type Dish,
  type Ingredient,
} from "@/lib/db";

const STORAGE_KEY = "que-comemos:available";

type Match = {
  dish: Dish;
  matched: string[];
  missing: string[];
};

function loadSelection() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }
  return [];
}

export default function CocinaPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [available, setAvailable] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setAvailable(loadSelection()), 0);
    return () => clearTimeout(id);
  }, []);

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

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(available));
    } catch {
      /* ignore */
    }
  }, [available]);

  const availableKeys = useMemo(
    () => new Set(available.map(keyOf)),
    [available]
  );

  const { ready, partial } = useMemo(() => {
    const results: { ready: Match[]; partial: Match[] } = { ready: [], partial: [] };

    for (const dish of dishes) {
      const matched = dish.ingredients.filter((i) => availableKeys.has(keyOf(i)));
      const missing = dish.ingredients.filter((i) => !availableKeys.has(keyOf(i)));
      if (matched.length === 0) continue;

      const match: Match = { dish, matched, missing };
      if (missing.length === 0) results.ready.push(match);
      else results.partial.push(match);
    }

    const byCompleteness = (a: Match, b: Match) =>
      b.matched.length / b.dish.ingredients.length -
        a.matched.length / a.dish.ingredients.length ||
      a.dish.name.localeCompare(b.dish.name, "es");

    results.ready.sort(byCompleteness);
    results.partial.sort(byCompleteness);
    return results;
  }, [dishes, availableKeys]);

  const totalMatches = ready.length + partial.length;

  if (error) {
    return (
      <ErrorState
        detail={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">¿Qué comemos? 👩‍🍳</h1>
        <p className="page-subtitle">Marcá lo que tenés en la heladera y te digo qué cocinar.</p>
      </header>

      <section className="card">
        <div className="field-label">
          Ingredientes que tengo{available.length > 0 && ` · ${available.length}`}
        </div>
        {ingredients.length === 0 ? (
          <p>
            Todavía no hay ingredientes cargados.{" "}
            <Link href="/ingredientes" style={{ fontWeight: 600 }}>
              Agregalos acá
            </Link>
            .
          </p>
        ) : (
          <ChipSelect
            options={ingredients.map((i) => i.name)}
            selected={available}
            onChange={setAvailable}
            placeholder="Buscar ingredientes…"
          />
        )}
        {available.length > 0 && (
          <div className="btn-row" style={{ marginTop: "14px" }}>
            <button
              type="button"
              className={`btn${dishes.length > 0 && totalMatches === 0 ? " btn--accent" : ""}`}
              onClick={() => setAvailable([])}
            >
              Vaciar selección
            </button>
          </div>
        )}
      </section>

      {dishes.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">🍽️</span>
          <p className="empty-title">No hay platillos cargados</p>
          <p>
            Sumá tus recetas en{" "}
            <Link href="/platillos" style={{ fontWeight: 600 }}>
              Platillos
            </Link>{" "}
            para que acá te diga qué cocinar.
          </p>
        </div>
      ) : totalMatches === 0 ? (
        <div className="empty">
          <span className="empty-icon">🥕</span>
          <p className="empty-title">
            {available.length === 0
              ? "Contame qué tenés"
              : "No encontré nada con eso"}
          </p>
          <p>
            {available.length === 0
              ? "Tocá los ingredientes que tengas a mano para ver qué podés cocinar."
              : "Probá seleccionar más ingredientes o cargar más platillos."}
          </p>
        </div>
      ) : (
        <>
          {ready.length > 0 && (
            <>
              <h2 className="section-title">
                ✅ Listo para cocinar · {ready.length}
              </h2>
              {ready.map((m) => (
                <DishMatchCard key={m.dish.id} match={m} kind="green" />
              ))}
            </>
          )}

          {partial.length > 0 && (
            <>
              <h2 className="section-title">
                🧩 Te falta alguno · {partial.length}
              </h2>
              {partial.map((m) => (
                <DishMatchCard key={m.dish.id} match={m} kind="yellow" />
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}

function DishMatchCard({ match, kind }: { match: Match; kind: "green" | "yellow" }) {
  return (
    <article className={`dish-card dish-card--${kind}`}>
      <div className="dish-head">
        <h3 className="dish-name">{match.dish.name}</h3>
        <span className={`badge badge--${kind}`}>
          {kind === "green" ? "¡Listo!" : "Casi"}
        </span>
      </div>
      <div className="chips" style={{ marginTop: 0 }}>
        {match.matched.map((name) => (
          <span key={name} className="chip chip--have">
            ✓ {name}
          </span>
        ))}
        {match.missing.map((name) => (
          <span key={`missing:${name}`} className="chip chip--missing">
            {name}
          </span>
        ))}
      </div>
      {match.dish.link && (
        <div className="dish-link-row">
          <a
            className="dish-link-btn"
            href={dishLinkHref(match.dish.link)}
            target="_blank"
            rel="noreferrer"
            title={`Ver video de ${match.dish.name}`}
            aria-label={`Ver video de ${match.dish.name}`}
          >
            <span className="dish-link-label">Hay videitoo 🎬</span>
          </a>
        </div>
      )}
    </article>
  );
}

function dishLinkHref(link: string) {
  const trimmed = link.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function LoadingState() {
  return (
    <div className="loading">
      <div className="spinner" aria-hidden="true" />
      Conectando con la heladera…
    </div>
  );
}

function ErrorState({ detail, onRetry }: { detail: string; onRetry: () => void }) {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">¿Qué comemos?</h1>
      </header>
      <div className="error-box">
        <p className="error-box-title">⚠️ Sin conexión a la base</p>
        <p>
          No se pudo conectar con Firestore. Verificá que esté creado, que el
          projectId sea quecomemos-8f167 y que las reglas permitan lectura.
        </p>
        <pre className="error-detail">{detail}</pre>
        <button type="button" className="btn btn--accent btn--block" style={{ marginTop: "12px" }} onClick={onRetry}>
          Reintentar
        </button>
      </div>
    </>
  );
}