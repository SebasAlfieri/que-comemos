import { db } from "./firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

export type Effort = "green" | "yellow" | "red";

export const EFFORTS: { value: Effort; label: string }[] = [
  { value: "green", label: "Bajo" },
  { value: "yellow", label: "Medio" },
  { value: "red", label: "Alto" },
];

export function isEffort(value: unknown): value is Effort {
  return value === "green" || value === "yellow" || value === "red";
}

export type Ingredient = { id: string; name: string };

export type Dish = {
  id: string;
  name: string;
  ingredients: string[];
  link?: string;
  notes?: Record<string, string>;
  effort?: Effort;
};

function capitalizeFirst(value: string) {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

export function normalizeName(value: string) {
  return capitalizeFirst(value.trim().replace(/\s+/g, " "));
}

export function describeFirestoreError(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const e = error as { code?: unknown; message?: unknown };
    const code = typeof e.code === "string" ? e.code : "";
    const message = typeof e.message === "string" ? e.message : "";
    if (code && message) return `${code}: ${message}`;
    if (code) return code;
    if (message) return message;
  }
  return String(error);
}

export function keyOf(value: string) {
  return normalizeName(value).toLocaleLowerCase();
}

export function dishLinkHref(link: string) {
  const trimmed = (link ?? "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function watchIngredients(
  onChange: (items: Ingredient[]) => void,
  onError: (error: unknown) => void
) {
  return onSnapshot(
    query(collection(db, "ingredients")),
    (snap) => {
      const items: Ingredient[] = snap.docs
        .map((d) => ({ id: d.id, name: d.data().name as string }))
        .filter((i) => typeof i.name === "string")
        .sort((a, b) => a.name.localeCompare(b.name, "es"));
      onChange(items);
    },
    onError
  );
}

export function watchDishes(
  onChange: (items: Dish[]) => void,
  onError: (error: unknown) => void
) {
  return onSnapshot(
    query(collection(db, "dishes")),
    (snap) => {
      const items: Dish[] = snap.docs
        .map((d) => ({
          id: d.id,
          name: d.data().name as string,
          ingredients: (d.data().ingredients ?? []) as string[],
          link: typeof d.data().link === "string" ? d.data().link : "",
          notes: (d.data().notes ?? {}) as Record<string, string>,
          effort: isEffort(d.data().effort) ? d.data().effort : undefined,
        }))
        .filter((d) => typeof d.name === "string")
        .sort((a, b) => a.name.localeCompare(b.name, "es"));
      onChange(items);
    },
    onError
  );
}

export async function addIngredient(
  name: string
): Promise<{ id: string; name: string; created: boolean } | null> {
  const nameSafe = normalizeName(name);
  if (!nameSafe) return null;

  const snapshot = await getDocs(collection(db, "ingredients"));
  const match = snapshot.docs.find((d) => {
    const stored = d.data().name;
    return typeof stored === "string" && keyOf(stored) === keyOf(nameSafe);
  });
  if (match) {
    return {
      id: match.id,
      name: match.data().name as string,
      created: false,
    };
  }

  const ref = await addDoc(collection(db, "ingredients"), {
    name: nameSafe,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, name: nameSafe, created: true };
}

export async function renameIngredient(
  id: string,
  oldName: string,
  newName: string,
  dishes: Dish[]
) {
  const newNameSafe = normalizeName(newName);
  if (!newNameSafe || !oldName) return;

  const batch = writeBatch(db);
  batch.update(doc(db, "ingredients", id), { name: newNameSafe });
  for (const dish of dishes) {
    if (dish.ingredients.some((i) => keyOf(i) === keyOf(oldName))) {
      const notes: Record<string, string> = {};
      for (const [key, value] of Object.entries(dish.notes ?? {})) {
        notes[keyOf(key) === keyOf(oldName) ? newNameSafe : key] = value;
      }
      batch.update(doc(db, "dishes", dish.id), {
        ingredients: dish.ingredients.map((i) =>
          keyOf(i) === keyOf(oldName) ? newNameSafe : i
        ),
        notes,
      });
    }
  }
  await batch.commit();
}

export async function deleteIngredient(id: string, name: string, dishes: Dish[]) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "ingredients", id));
  for (const dish of dishes) {
    const remaining = dish.ingredients.filter((i) => keyOf(i) !== keyOf(name));
    if (remaining.length !== dish.ingredients.length) {
      const notes: Record<string, string> = {};
      for (const [key, value] of Object.entries(dish.notes ?? {})) {
        if (keyOf(key) !== keyOf(name)) notes[key] = value;
      }
      batch.update(doc(db, "dishes", dish.id), {
        ingredients: remaining,
        notes,
      });
    }
  }
  await batch.commit();
}

export async function saveDish(
  id: string | null,
  name: string,
  ingredients: string[],
  link = "",
  notes: Record<string, string> = {},
  effort: Effort | undefined = undefined
) {
  const nameSafe = normalizeName(name);
  if (!nameSafe) return;
  const ingredientsSafe = ingredients
    .map(normalizeName)
    .filter((i) => i.length > 0);
  const linkSafe = link.trim();

  const notesSafe: Record<string, string> = {};
  for (const ing of ingredientsSafe) {
    const entry = Object.entries(notes).find(([k]) => keyOf(k) === keyOf(ing));
    const value = (entry?.[1] ?? "").trim();
    if (value) notesSafe[ing] = value;
  }

  const effortSafe = effort ? (isEffort(effort) ? effort : undefined) : undefined;

  if (id) {
    await updateDoc(doc(db, "dishes", id), {
      name: nameSafe,
      ingredients: ingredientsSafe,
      link: linkSafe,
      notes: notesSafe,
      effort: effortSafe ?? null,
    });
  } else {
    await addDoc(collection(db, "dishes"), {
      name: nameSafe,
      ingredients: ingredientsSafe,
      link: linkSafe,
      notes: notesSafe,
      effort: effortSafe ?? null,
      createdAt: serverTimestamp(),
    });
  }
}

export async function deleteDish(id: string) {
  await deleteDoc(doc(db, "dishes", id));
}