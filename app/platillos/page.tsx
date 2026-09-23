"use client";

import { useEffect, useState } from "react";
import DishDetail from "@/components/DishDetail";
import DishForm from "@/components/DishForm";
import {
  dishLinkHref,
  watchDishes,
  watchIngredients,
  type Dish,
  type Ingredient,
} from "@/lib/db";

export default function PlatillosPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [detail, setDetail] = useState<Dish | null>(null);

  useEffect(() => {
    const unDishes = watchDishes(
      (items) => {
        setDishes(items);
        setLoading(false);
      },
      () => {
        setError("firestore");
        setLoading(false);
      }
    );
    const unIngredients = watchIngredients(
      (items) => {
        setIngredients(items);
        setLoading(false);
      },
      () => {
        setError("firestore");
        setLoading(false);
      }
    );
    return () => {
      unDishes();
      unIngredients();
    };
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (dish: Dish) => {
    setEditing(dish);
    setFormOpen(true);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" aria-hidden="true" />
        Cargando platillos…
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Platillos 🍳</h1>
        <p className="page-subtitle">
          Tus recetas, con los ingredientes que usan.
        </p>
      </header>

      <button
        type="button"
        className="btn btn--accent btn--block"
        style={{ margin: "16px 0" }}
        onClick={openCreate}
      >
        + Nuevo platillo
      </button>

      {error && (
        <div className="error-box">
          <p className="error-box-title">⚠️ Sin conexión a la base</p>
          <p>Revisá que Firestore esté habilitado en Firebase Console.</p>
        </div>
      )}

      {dishes.length === 0 && !error ? (
        <div className="empty">
          <span className="empty-icon">🍽️</span>
          <p className="empty-title">Todavía no hay platillos</p>
          <p>Agregá tu primera receta y los ingredientes que lleva.</p>
        </div>
      ) : (
dishes.map((dish) => (
          <article
            key={dish.id}
            className="list-item list-item--open"
            onClick={() => setDetail(dish)}
          >
            <div className="list-item-name">{dish.name}</div>
            {dish.link && (
              <a
                className="play-btn"
                href={dishLinkHref(dish.link)}
                target="_blank"
                rel="noreferrer"
                title={`Ver video de ${dish.name}`}
                aria-label={`Ver video de ${dish.name}`}
                onClick={(e) => e.stopPropagation()}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="9"
                  height="9"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </a>
            )}
            <span className="count-pill count-pill--num">{dish.ingredients.length}</span>
            <button
              type="button"
              className="icon-btn list-edit"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(dish);
              }}
              aria-label={`Editar ${dish.name}`}
            >
              ✏️
            </button>
          </article>
        ))
      )}

      {formOpen && (
        <DishForm
          initial={editing}
          ingredients={ingredients}
          onClose={() => setFormOpen(false)}
        />
      )}

      {detail && <DishDetail dish={detail} onClose={() => setDetail(null)} />}
    </>
  );
}