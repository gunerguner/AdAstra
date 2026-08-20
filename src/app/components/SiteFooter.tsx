import styles from './SiteFooter.module.css'

const START_YEAR = 2020
const CURRENT_YEAR = new Date().getFullYear()
const COPYRIGHT = `${START_YEAR}${CURRENT_YEAR > START_YEAR ? `-${CURRENT_YEAR}` : ''} 溯宁`

const LINKS = [
  { key: 'react', title: 'React', href: 'https://react.dev/' },
  { key: 'three', title: 'Three', href: 'https://threejs.org/' },
  { key: 'github', title: 'GitHub', href: 'https://github.com/gunerguner/AdAstra' },
  { key: 'icp', title: '沪ICP备2020026170号', href: 'https://beian.miit.gov.cn/' },
] as const

export default function SiteFooter() {
  return (
    <div className={styles.cluster}>
      {LINKS.map((link) => (
        <a
          key={link.key}
          className={styles.link}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {link.title}
        </a>
      ))}
      <span>© {COPYRIGHT}</span>
    </div>
  )
}
