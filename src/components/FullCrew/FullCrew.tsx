import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useShowMore } from '../../shared/hooks/useShowMore'
import Button from '../../shared/ui/Button/Button'
import ShowMore from '../../shared/ui/ShowMore/ShowMore'
import type { CrewMember } from '../../types/tmdb'
import { crewByDepartment, crewSize } from '../../utils/fullCrew'
import styles from './FullCrew.module.css'

/**
 * Everyone who worked on the title, by department (Directing, Writing, Camera…), behind a
 * button: a big production lists hundreds of names, and the key crew above covers most visits.
 * Job names are TMDB's own wording; the departments are translated.
 */
export default function FullCrew({ crew }: { crew: CrewMember[] }) {
  const { t } = useTranslation('person')
  const [open, setOpen] = useState(false)
  const panel = useId()
  const departments = open ? crewByDepartment(crew) : []
  const size = crewSize(crew)
  if (size === 0) return null

  return (
    <div className={styles.root}>
      <Button
        variant="ghost"
        className={styles.toggle}
        iconRight="chevron-down"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen(!open)}
      >
        {open ? t('hideFullCrew') : t('fullCrew', { count: size })}
      </Button>

      <div id={panel} hidden={!open}>
        {departments.map((department) => (
          <section
            key={department.name}
            className={styles.department}
            aria-label={
              department.departmentKey
                ? t(`departments.${department.departmentKey}`)
                : department.name
            }
          >
            <h3 className={styles.heading}>
              {department.departmentKey
                ? t(`departments.${department.departmentKey}`)
                : department.name}
              <span className={styles.count}>{department.people.length}</span>
            </h3>
            <DepartmentPeople people={department.people} />
          </section>
        ))}
      </div>
    </div>
  )
}

type Person = ReturnType<typeof crewByDepartment>[number]['people'][number]

/** One department's people; a big department folds after 5 (phone) or 12 names. */
function DepartmentPeople({ people }: { people: Person[] }) {
  const more = useShowMore(people)
  return (
    <>
      <ul className={styles.people}>
        {more.visible.map((person) => (
          <li key={person.id}>
            <Link to={`/person/${person.id}`} className={styles.person}>
              <span className={styles.name}>{person.name}</span>
              <span className={styles.jobs}>{person.jobs.join(', ')}</span>
            </Link>
          </li>
        ))}
      </ul>
      {more.collapsible && (
        <ShowMore expanded={more.expanded} total={people.length} onToggle={more.toggle} />
      )}
    </>
  )
}
