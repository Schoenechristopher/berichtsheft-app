import { redirect } from "next/navigation";
import { homePathFor } from "@/domain/access";
import { requirePerson } from "@/lib/session";

/** Einstieg: leitet zur Startseite der eigenen Rolle. */
export default async function HomePage() {
  const person = await requirePerson();
  redirect(homePathFor(person.role));
}
