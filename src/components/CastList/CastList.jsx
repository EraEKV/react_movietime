import { imageUrl } from '../../api/tmdb.js'
import styles from './CastList.module.css'

export default function CastList({ cast }) {
  return (
    <ul className={styles.list}>
      {cast.map((person) => {
        const photo = imageUrl(person.profile_path, 'w185')
        return (
          // credit_id is unique per role; the same actor can appear twice with different roles.
          <li key={person.credit_id} className={styles.person}>
            <div className={styles.photo}>
              {photo ? (
                <img src={photo} alt={person.name} loading="lazy" />
              ) : (
                <span aria-hidden="true">{person.name.charAt(0)}</span>
              )}
            </div>
            <p className={styles.name}>{person.name}</p>
            {person.character && (
              <p className={styles.character} title={person.character}>
                {person.character}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
