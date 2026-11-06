import { Link, type LinkProps } from 'react-router'
import Icon from '../Icon/Icon'
import styles from './SectionHeader.module.css'

/** "Open planner →": the text action on the right of a section header. */
export default function SectionLink({ children, ...props }: LinkProps) {
  return (
    <Link className={styles.link} {...props}>
      {children}
      <Icon name="arrow-right" size={16} />
    </Link>
  )
}
