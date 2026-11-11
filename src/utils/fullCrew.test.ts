import { describe, expect, it } from 'vitest'
import { crewByDepartment, crewSize, departmentKey } from './fullCrew'

const member = (id: number, name: string, job: string, department: string) => ({
  id,
  name,
  job,
  department,
})

describe('crewByDepartment', () => {
  const crew = [
    member(1, 'Lana', 'Director', 'Directing'),
    member(1, 'Lana', 'Screenplay', 'Writing'),
    member(2, 'Lilly', 'Director', 'Directing'),
    member(3, 'Bill', 'Director of Photography', 'Camera'),
    member(4, 'Zed', 'Gaffer', 'Lighting'),
    member(5, 'Ann', 'Stunt Double', 'Zebra'),
    member(6, 'Bob', 'Aerial Camera', 'Aardvark'),
    member(3, 'Bill', 'Camera Operator', 'Camera'),
    member(3, 'Bill', 'Camera Operator', 'Camera'),
  ]

  it('groups by department in the shown order, unknown ones last and A to Z', () => {
    expect(crewByDepartment(crew).map((d) => d.name)).toEqual([
      'Directing',
      'Writing',
      'Camera',
      'Lighting',
      'Aardvark',
      'Zebra',
    ])
  })

  it('lists a person once per department with each job once', () => {
    const camera = crewByDepartment(crew).find((d) => d.name === 'Camera')
    expect(camera?.people).toEqual([
      { id: 3, name: 'Bill', jobs: ['Director of Photography', 'Camera Operator'] },
    ])
    const directing = crewByDepartment(crew).find((d) => d.name === 'Directing')
    expect(directing?.people.map((p) => p.name)).toEqual(['Lana', 'Lilly'])
  })

  it('puts people with a key job first inside a department', () => {
    const list = [
      member(1, 'Tom', 'Second Assistant Director', 'Directing'),
      member(2, 'Sue', 'Script Supervisor', 'Directing'),
      member(3, 'Lana', 'Director', 'Directing'),
    ]
    expect(crewByDepartment(list)[0]?.people.map((p) => p.name)).toEqual(['Lana', 'Tom', 'Sue'])
  })

  it('puts a person who works in two departments in both', () => {
    const names = (department: string) =>
      crewByDepartment(crew)
        .find((d) => d.name === department)
        ?.people.map((p) => p.name)
    expect(names('Directing')).toContain('Lana')
    expect(names('Writing')).toEqual(['Lana'])
  })

  it('knows a dictionary key for the standard departments only', () => {
    expect(departmentKey('Costume & Make-Up')).toBe('costumeMakeUp')
    expect(departmentKey('Zebra')).toBeNull()
  })

  it('skips credits without a department and handles an empty crew', () => {
    expect(crewByDepartment([member(1, 'X', 'Y', '')])).toEqual([])
    expect(crewByDepartment([])).toEqual([])
  })
})

describe('crewSize', () => {
  it('counts different people, not credits', () => {
    expect(
      crewSize([member(1, 'A', 'x', 'd'), member(1, 'A', 'y', 'e'), member(2, 'B', 'x', 'd')]),
    ).toBe(2)
  })
})
