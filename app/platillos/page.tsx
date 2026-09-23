"use client";

import { useEffect, useState } from "react";
import DishForm from "@/components/DishForm";
import {
  deleteDish,
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

  const handleDelete = async (dish: Dish) => {
    if (!window.confirm(`¿Eliminar «${dish.name}»?`)) return;
    try {
      await deleteDish(dish.id);
    } catch {
      window.alert("No se pudo eliminar. Revisá la conexión.");
    }
  };

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
          <article key={dish.id} className="list-item">
            <div className="list-item-name">{dish.name}</div>
            <span className="count-pill">{dish.ingredients.length}</span>
            <div className="actions">
              <button
                type="button"
                className="icon-btn"
                onClick={() => openEdit(dish)}
                aria-label={`Editar ${dish.name}`}
              >
                ✏️
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => handleDelete(dish)}
                aria-label={`Eliminar ${dish.name}`}
              >
                🗑️
              </button>
            </div>
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
    </>
  );
}