import type { CrewMember } from '../types/tmdb'

// The whole crew of a title, grouped the way TMDB groups it (by department) for the
// "Full crew" panel. The short list of key people lives in utils/person.ts.

/** Departments in the order they are shown; TMDB's English names, as they arrive. */
const DEPARTMENT_ORDER = [
  'Directing',
  'Writing',
  'Production',
  'Camera',
  'Editing',
  'Sound',
  'Art',
  'Costume & Make-Up',
  'Visual Effects',
  'Lighting',
  'Crew',
] as const

/** Dictionary keys (person:departments.*) of the departments the app has a name for. */
const DEPARTMENT_KEY = {
  Directing: 'directing',
  Writing: 'writing',
  Production: 'production',
  Camera: 'camera',
  Editing: 'editing',
  Sound: 'sound',
  Art: 'art',
  'Costume & Make-Up': 'costumeMakeUp',
  'Visual Effects': 'visualEffects',
  Lighting: 'lighting',
  Crew: 'crew',
} as const satisfies Record<(typeof DEPARTMENT_ORDER)[number], string>

export type DepartmentKey = (typeof DEPARTMENT_KEY)[keyof typeof DEPARTMENT_KEY]

export interface DepartmentPerson {
  id: number
  name: string
  /** Their jobs in this department, TMDB's wording, each once. */
  jobs: string[]
}

export interface Department {
  /** TMDB's name; the label is `departmentKey` when the app has one, else this. */
  name: string
  departmentKey: DepartmentKey | null
  people: DepartmentPerson[]
}

export const departmentKey = (name: string): DepartmentKey | null =>
  (DEPARTMENT_KEY as Record<string, DepartmentKey>)[name] ?? null

/**
 * Crew → departments with one entry per person (a director who also wrote is in both
 * departments, once in each). People keep TMDB's order, which puts the senior ones first.
 * Departments follow `DEPARTMENT_ORDER`; ones the list does not know come last, A to Z.
 */
export function crewByDepartment(crew: Pick<CrewMember, 'id' | 'name' | 'job' | 'department'>[]) {
  const departments = new Map<string, Map<number, DepartmentPerson>>()
  for (const member of crew) {
    if (!member.department) continue
    const people = departments.get(member.department) ?? new Map<number, DepartmentPerson>()
    const person = people.get(member.id) ?? { id: member.id, name: member.name, jobs: [] }
    if (member.job && !person.jobs.includes(member.job)) person.jobs.push(member.job)
    people.set(member.id, person)
    departments.set(member.department, people)
  }

  const rank = (name: string) => {
    const index = (DEPARTMENT_ORDER as readonly string[]).indexOf(name)
    return index === -1 ? DEPARTMENT_ORDER.length : index
  }
  return [...departments]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([name, people]): Department => ({
      name,
      departmentKey: departmentKey(name),
      people: [...people.values()],
    }))
}

/** How many different people worked on the title. */
export const crewSize = (crew: Pick<CrewMember, 'id'>[]): number =>
  new Set(crew.map((member) => member.id)).size
