import { Link } from 'react-router-dom'

export function ShowcaseHero({ title, description, backTo = '/', eyebrow }) {
  return (
    <header className="showcase-hero">
      <Link to={backTo} className="showcase-link-back">
        ← Volver al playground
      </Link>
      {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
      <h1 className="showcase-hero__title">{title}</h1>
      {description ? <p className="showcase-hero__desc">{description}</p> : null}
    </header>
  )
}

export function ShowcaseBlock({ title, rule, children, id }) {
  return (
    <section className="showcase-block" id={id}>
      <div className="showcase-block__head">
        <h2 className="showcase-block__title">{title}</h2>
        {rule ? <p className="showcase-block__rule">{rule}</p> : null}
      </div>
      <div className="showcase-block__body">{children}</div>
    </section>
  )
}
