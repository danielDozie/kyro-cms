import { PickedIcon } from "./picked-icon";
import React, { useId, useState } from "react";
import { KyroRichTextRenderer } from "@kyro-cms/rich-text-react";
import type { StudioRenderProps, StudioComponent } from "./types";
import { attr, Buttons, Heading, IconGlyph, Intro, list, Media, reference, safeStudioUrl, text } from "./primitives";
const section =
  (Component: React.ComponentType<StudioRenderProps>, className = "") =>
  (props: StudioRenderProps) => (
    <section className={`kyro-section ${className}`}>
      <Component {...props} />
    </section>
  );
export function Hero(props: StudioRenderProps) {
  const { block, editing } = props;
  const [slideIndex, setSlideIndex] = useState(0);
  const slides = block.isMultiScreen ? list(block.multiSlides?.multiSlides) : [block.singleSlide || {}];
  const index = Math.min(slideIndex, Math.max(0, slides.length - 1));
  const slide = slides[index] || {};
  const prefix = block.isMultiScreen ? `multiSlides.multiSlides.${index}` : "singleSlide";
  return (
    <section className="kyro-hero">
      <div className={`kyro-split ${slide.backgroundImage ? "" : "kyro-single"}`}>
        <div>
          <h1 {...attr(props, `${prefix}.title`)}>
            {text(slide.title) || (editing ? "Your next great story starts here." : "")}
          </h1>
          <p {...attr(props, `${prefix}.subtitle`)}>
            {text(slide.subtitle) || (editing ? "Add a short introduction that gives visitors a reason to stay." : "")}
          </p>
          <Buttons items={slide.buttons} path={`${prefix}.buttons`} props={props} />
        </div>
        {slide.backgroundImage && (
          <Media value={slide.backgroundImage} path={`${prefix}.backgroundImage`} props={props} />
        )}
      </div>
      {slides.length > 1 && (
        <div className="kyro-carousel-controls" data-kyro-interactive>
          {slides.map((_, i) => (
            <button
              type="button"
              key={i}
              aria-label={`Show slide ${i + 1}`}
              aria-pressed={index === i}
              onClick={() => setSlideIndex(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
function RichText(props: StudioRenderProps) {
  let content = props.block.content;
  if (typeof content === "string") {
    try {
      content = JSON.parse(content);
    } catch {
      return <p {...attr(props, "content")}>{content}</p>;
    }
  }
  return (
    <div className="kyro-rich-content" {...attr(props, "content")}>
      {content && (
        <KyroRichTextRenderer
          content={content}
          components={{
            marks: { link: ({ mark, children }: any) => <a href={safeStudioUrl(mark.attrs?.href)}>{children}</a> },
            types: {
              image: ({ node }: any) =>
                safeStudioUrl(node.attrs?.src) ? (
                  <img src={safeStudioUrl(node.attrs.src)} alt={text(node.attrs?.alt)} />
                ) : null,
            },
          }}
        />
      )}
    </div>
  );
}
function Card(props: StudioRenderProps) {
  const multi = props.block.isMultiCard;
  const cards = multi ? list(props.block.multiCards?.cards) : [props.block.singleCard || {}];
  return (
    <div className={multi ? "kyro-grid" : ""}>
      {cards.map((card, index) => {
        const prefix = multi ? `multiCards.cards.${index}` : "singleCard";
        return (
          <article className="kyro-card" key={card.id || index}>
            {card.image && <Media value={card.image} props={props} path={`${prefix}.image`} />}
            <h3 {...attr(props, `${prefix}.title`)}>{text(card.title)}</h3>
            <p {...attr(props, `${prefix}.description`)}>{text(card.description)}</p>
            {card.icon && (
              <small {...attr(props, `${prefix}.icon`)}>
                <IconGlyph name={card.icon} />
              </small>
            )}
            {card.linkText && (
              <a href={safeStudioUrl(card.link)} {...attr(props, `${prefix}.linkText`)}>
                {text(card.linkText)} ↗
              </a>
            )}
          </article>
        );
      })}
    </div>
  );
}
function ImageBlock(props: StudioRenderProps) {
  const b = props.block;
  const ratios: Record<string, string> = { "16-9": "16/9", "4-3": "4/3", "1-1": "1", "2-3": "2/3" };
  const image = (
    <div style={{ aspectRatio: ratios[b.aspectRatio] }}>
      <Media value={b.image} props={props} path="image" alt={text(b.alt)} />
    </div>
  );
  return (
    <figure className="kyro-image">
      {b.enableLightbox ? (
        <details data-kyro-interactive>
          <summary>
            {image}
            <span>Enlarge image</span>
          </summary>
          <Media value={b.image} props={props} path="image" alt={text(b.alt)} />
        </details>
      ) : (
        image
      )}
      {b.caption && <figcaption {...attr(props, "caption")}>{text(b.caption)}</figcaption>}
    </figure>
  );
}
function FeatureSplit(props: StudioRenderProps) {
  const b = props.block;
  return (
    <>
      <Intro props={props} />
      <div className="kyro-split">
        <div>
          {list(b.checkpoints).map((item, index) => (
            <article className="kyro-checkpoint" key={item.id || index}>
              {item.image && <Media value={item.image} path={`checkpoints.${index}.image`} props={props} />}
              <h3 {...attr(props, `checkpoints.${index}.title`)}>
                {item.icon && (
                  <small>
                    <IconGlyph name={item.icon} />
                  </small>
                )}
                {text(item.title)}
              </h3>
              <p {...attr(props, `checkpoints.${index}.description`)}>{text(item.description)}</p>
              {item.itemText && (
                <a href={safeStudioUrl(item.itemUrl)} {...attr(props, `checkpoints.${index}.itemText`)}>
                  {text(item.itemText)}
                </a>
              )}
            </article>
          ))}
          <Buttons items={b.buttons} props={props} />
        </div>
        <div>
          {list(b.images).map((item, index) => (
            <Media key={item.id || index} value={item.image} path={`images.${index}.image`} props={props} />
          ))}
        </div>
      </div>
    </>
  );
}
function FeatureGrid(props: StudioRenderProps) {
  return (
    <>
      <Intro props={props} />
      <div className="kyro-grid">
        {list(props.block.features).map((item, index) => (
          <article className="kyro-card" key={item.id || index}>
            {item.image && <Media value={item.image} path={`features.${index}.image`} props={props} />}
            <h3 {...attr(props, `features.${index}.title`)}>{text(item.title)}</h3>
            <p {...attr(props, `features.${index}.description`)}>{text(item.description)}</p>
            {item.icon && (
              <small {...attr(props, `features.${index}.icon`)}>
                <IconGlyph name={item.icon} />
              </small>
            )}
            {item.itemUrl && (
              <a href={safeStudioUrl(item.itemUrl)} {...attr(props, `features.${index}.itemUrl`)}>
                Explore ↗
              </a>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
function CTA(props: StudioRenderProps) {
  return (
    <div className="kyro-cta">
      <Intro props={props} />
      {props.block.backgroundImage && (
        <Media value={props.block.backgroundImage} path="backgroundImage" props={props} />
      )}
      <Buttons items={props.block.buttons} props={props} />
    </div>
  );
}
function Testimonials(props: StudioRenderProps) {
  return (
    <>
      <Intro props={props} />
      <div className="kyro-grid">
        {list(props.block.items).map((item, index) => (
          <figure className="kyro-card" key={item.id || index}>
            <span {...attr(props, `items.${index}.rating`)} aria-label={`${item.rating || 5} out of 5 stars`}>
              {"★".repeat(Math.max(0, Math.min(5, Number(item.rating) || 0)))}
            </span>
            <blockquote {...attr(props, `items.${index}.quote`)}>{text(item.quote)}</blockquote>
            <figcaption>
              {item.avatar && (
                <Media value={item.avatar} path={`items.${index}.avatar`} props={props} className="kyro-avatar" />
              )}
              <strong {...attr(props, `items.${index}.authorName`)}>{text(item.authorName)}</strong>
              <p {...attr(props, `items.${index}.authorRole`)}>{text(item.authorRole)}</p>
              {item.companyLogo && (
                <Media
                  value={item.companyLogo}
                  path={`items.${index}.companyLogo`}
                  props={props}
                  className="kyro-logo"
                />
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
function FAQ(props: StudioRenderProps) {
  return (
    <>
      <Intro props={props} />
      {list(props.block.items).map((item, index) => (
        <details className="kyro-faq" key={item.id || index} data-kyro-interactive>
          <summary {...attr(props, `items.${index}.question`)}>
            {item.tag && <small>{text(item.tag)} · </small>}
            {text(item.question)}
          </summary>
          <p {...attr(props, `items.${index}.answer`)}>{text(item.answer)}</p>
        </details>
      ))}
      {props.block.footerTitle && (
        <a className="kyro-faq-footer" href={safeStudioUrl(props.block.footerCtaUrl)} {...attr(props, "footerTitle")}>
          {text(props.block.footerTitle)} ↗
        </a>
      )}
    </>
  );
}
function Stats(props: StudioRenderProps) {
  return (
    <>
      <Intro props={props} />
      <div className="kyro-grid">
        {list(props.block.items).map((item, index) => (
          <article key={item.id || index}>
            <p className="kyro-stat" {...attr(props, `items.${index}.value`)}>
              {text(item.prefix)}
              {text(item.value)}
              {text(item.suffix)}
            </p>
            <h3 {...attr(props, `items.${index}.label`)}>{text(item.label)}</h3>
            <p {...attr(props, `items.${index}.description`)}>{text(item.description)}</p>
          </article>
        ))}
      </div>
    </>
  );
}
function Logos(props: StudioRenderProps) {
  return (
    <>
      <Intro props={props} />
      <div className="kyro-logos">
        {list(props.block.logos).map((item, index) => (
          <a key={item.id || index} href={safeStudioUrl(item.url)}>
            <Media
              value={item.logo}
              props={props}
              path={`logos.${index}.logo`}
              alt={text(item.name)}
              className="kyro-logo"
            />
            <span {...attr(props, `logos.${index}.name`)}>{text(item.name)}</span>
          </a>
        ))}
      </div>
    </>
  );
}
function Pricing(props: StudioRenderProps) {
  return (
    <>
      <Intro props={props} />
      {props.block.annualDiscount && <p {...attr(props, "annualDiscount")}>{text(props.block.annualDiscount)}</p>}
      <div className="kyro-grid">
        {list(props.block.plans).map((item, index) => (
          <article className={`kyro-card ${item.isFeatured ? "kyro-featured" : ""}`} key={item.id || index}>
            <small {...attr(props, `plans.${index}.popularBadgeText`)}>{text(item.popularBadgeText)}</small>
            <h3 {...attr(props, `plans.${index}.name`)}>{text(item.name)}</h3>
            <p {...attr(props, `plans.${index}.description`)}>{text(item.description)}</p>
            <p className="kyro-stat" {...attr(props, `plans.${index}.price`)}>
              {text(item.currency)}
              {text(item.price)}
              <small>{text(item.billingPeriod)}</small>
            </p>
            <ul {...attr(props, `plans.${index}.features`)}>
              {list(item.features).map((feature, n) => (
                <li key={n}>{text(feature?.text ?? feature?.value ?? feature)}</li>
              ))}
            </ul>
            <Buttons items={item.buttons} path={`plans.${index}.buttons`} props={props} />
            <small {...attr(props, `plans.${index}.footnote`)}>{text(item.footnote)}</small>
          </article>
        ))}
      </div>
    </>
  );
}
function Team(props: StudioRenderProps) {
  return (
    <>
      <Intro props={props} />
      <div className="kyro-grid">
        {list(props.block.members).map((item, index) => (
          <article key={item.id || index}>
            {item.avatar && <Media value={item.avatar} path={`members.${index}.avatar`} props={props} />}
            <small {...attr(props, `members.${index}.department`)}>{text(item.department)}</small>
            <h3 {...attr(props, `members.${index}.name`)}>{text(item.name)}</h3>
            <p {...attr(props, `members.${index}.role`)}>{text(item.role)}</p>
            <p {...attr(props, `members.${index}.bio`)}>{text(item.bio)}</p>
            <div className="kyro-actions">
              {["websiteUrl", "twitterUrl", "linkedinUrl", "githubUrl"]
                .filter((key) => item[key])
                .map((key) => (
                  <a key={key} {...attr(props, `members.${index}.${key}`)} href={safeStudioUrl(item[key])}>
                    {key.replace("Url", "")} ↗
                  </a>
                ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
function Feed(props: StudioRenderProps) {
  return (
    <>
      <Intro props={props} />
      <div className="kyro-grid">
        {list(props.block.selectedItems).map((item, index) => {
          const doc = reference(item, item?.relationTo || "*", props);
          return doc ? (
            <article className="kyro-card" key={doc.id || index}>
              <h3 {...attr(props, `selectedItems.${index}`)}>{text(doc.title || doc.name)}</h3>
              <p>{text(doc.excerpt || doc.description)}</p>
            </article>
          ) : props.editing ? (
            <p key={index} {...attr(props, `selectedItems.${index}`)}>
              Resolving selected content…
            </p>
          ) : null;
        })}
      </div>
      <Buttons items={props.block.buttons} props={props} />
    </>
  );
}
function Steps(props: StudioRenderProps) {
  return (
    <>
      <Intro props={props} />
      <ol className="kyro-grid kyro-steps">
        {list(props.block.steps).map((step, index) => (
          <li key={step.id || index}>
            {step.icon && <Media value={step.icon} path={`steps.${index}.icon`} props={props} />}
            <span className="kyro-stat" {...attr(props, `steps.${index}.stepNumber`)}>
              {text(step.stepNumber) || String(index + 1).padStart(2, "0")}
            </span>
            <h3 {...attr(props, `steps.${index}.title`)}>{text(step.title)}</h3>
            <p {...attr(props, `steps.${index}.description`)}>{text(step.description)}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
function FormEmbed(props: StudioRenderProps) {
  const form = reference(props.block.form, "forms", props);
  if (form && props.context?.renderForm)
    return (
      <>
        <Intro props={props} />
        {props.context.renderForm(form, props)}
      </>
    );
  return (
    <>
      <Intro props={props} />
      <div className="kyro-form-preview" {...attr(props, "form")}>
        {form ? (
          <>
            {list(form.fields).map((f, index) => (
              <label key={f.id || index}>
                {text(f.fieldName)}
                {f.isRequired && " *"}
                {f.inputType === "textarea" ? (
                  <textarea disabled placeholder={text(f.placeholder)} />
                ) : (
                  <input
                    disabled
                    type={["text", "email", "tel", "checkbox"].includes(f.inputType) ? f.inputType : "text"}
                    placeholder={text(f.placeholder)}
                  />
                )}
              </label>
            ))}
            <button type="button" disabled>
              {text(form.submitButtonText) || "Submit"}
            </button>
          </>
        ) : (
          <p>Choose a form in the inspector.</p>
        )}
        {props.editing && <small>Form preview · submission adapter required</small>}
      </div>
    </>
  );
}
function Video(props: StudioRenderProps) {
  const b = props.block;
  const source = safeStudioUrl(b.videoUrl || b.url || reference(b.file, "media", props)?.url);
  const embed = source?.match(/^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  const vimeo = source?.match(/^https:\/\/(?:www\.)?vimeo\.com\/(\d+)/);
  return (
    <>
      <Intro props={props} />
      <figure {...attr(props, b.videoUrl ? "videoUrl" : "url")}>
        {props.editing ? (
          <div className="kyro-video-preview">
            {b.coverImage ? <Media value={b.coverImage} path="coverImage" props={props} /> : <span aria-hidden>▶</span>}
            <p>{text(b.videoTitle) || source || "Choose a video"}</p>
            {b.durationBadge && <small>{text(b.durationBadge)}</small>}
          </div>
        ) : embed || vimeo ? (
          <iframe
            title={text(b.videoTitle) || "Video"}
            src={
              embed
                ? `https://www.youtube-nocookie.com/embed/${embed[1]}`
                : `https://player.vimeo.com/video/${vimeo![1]}`
            }
            loading="lazy"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        ) : source ? (
          <video
            controls
            muted={!!b.autoplay}
            autoPlay={!!b.autoplay}
            poster={safeStudioUrl(reference(b.coverImage, "media", props)?.url)}
            src={source}
          />
        ) : null}
        {b.caption && <figcaption {...attr(props, "caption")}>{text(b.caption)}</figcaption>}
      </figure>
    </>
  );
}
function Gallery(props: StudioRenderProps) {
  return (
    <>
      <Intro props={props} />
      <div className="kyro-grid">
        {list(props.block.images).map((item, index) => (
          <figure key={item.id || index}>
            <Media value={item.image} path={`images.${index}.image`} props={props} />
            {item.caption && <figcaption {...attr(props, `images.${index}.caption`)}>{text(item.caption)}</figcaption>}
          </figure>
        ))}
      </div>
    </>
  );
}
function Tabs(props: StudioRenderProps) {
  const [active, setActive] = useState(0);
  const id = useId();
  const items = list(props.block.items);
  const index = Math.min(active, Math.max(0, items.length - 1));
  return (
    <>
      <Intro props={props} />
      <div className="kyro-tabs" role="tablist" data-kyro-interactive>
        {items.map((item, i) => (
          <button
            key={item.id || i}
            type="button"
            id={`${id}-tab-${i}`}
            role="tab"
            aria-selected={i === index}
            aria-controls={`${id}-panel`}
            tabIndex={i === index ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(event) => {
              let next = i;
              if (event.key === "ArrowRight") next = (i + 1) % items.length;
              else if (event.key === "ArrowLeft") next = (i + items.length - 1) % items.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = items.length - 1;
              else return;
              event.preventDefault();
              setActive(next);
              event.currentTarget.ownerDocument.getElementById(`${id}-tab-${next}`)?.focus();
            }}
            {...attr(props, `items.${i}.title`)}
          >
            {text(item.title)}
          </button>
        ))}
      </div>
      {items[index] && (
        <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`}>
          <RichText
            {...props}
            block={{ ...props.block, content: items[index].content }}
            pathPrefix={props.pathPrefix ? `${props.pathPrefix}.items.${index}` : `items.${index}`}
          />
        </div>
      )}
    </>
  );
}

const item = (
  type: string,
  label: string,
  Component: React.ComponentType<StudioRenderProps>,
  category: string,
  defaults: Record<string, any> = {},
): StudioComponent => ({
  type,
  label,
  Component: section(Component),
  category,
  defaults,
  requiresFormAdapter: type === "formEmbed",
});
export const contentComponents: StudioComponent[] = [
  {
    type: "hero",
    label: "Hero",
    Component: Hero,
    category: "Marketing",
    defaults: {
      isMultiScreen: false,
      singleSlide: {
        title: "Your next great story starts here.",
        subtitle: "A clear introduction to what you do and why it matters.",
        buttons: [{ text: "Explore more", url: "#" }],
      },
    },
  },
  item("card", "Cards", Card, "Marketing", {
    isMultiCard: false,
    singleCard: { title: "A useful idea", description: "Share the details that matter." },
  }),
  item("text", "Text section", RichText, "Content"),
  item("image", "Image", ImageBlock, "Media", { aspectRatio: "original" }),
  item("featureSplit", "Feature split", FeatureSplit, "Marketing", {
    title: "Built around your needs",
    checkpoints: [],
  }),
  item("featureGrid", "Feature grid", FeatureGrid, "Marketing", { title: "Everything you need", features: [] }),
  item("ctaBanner", "Call to action", CTA, "Marketing", {
    title: "Ready for your next step?",
    buttons: [{ text: "Get started", url: "#" }],
  }),
  item("testimonials", "Testimonials", Testimonials, "Marketing", { title: "In good company", items: [] }),
  item("faq", "FAQ", FAQ, "Interactive", { title: "Frequently asked questions", items: [] }),
  item("stats", "Stats", Stats, "Marketing", { title: "Progress in numbers", items: [] }),
  item("logoCloud", "Logos", Logos, "Marketing", { title: "Trusted by", logos: [] }),
  item("pricing", "Pricing", Pricing, "Marketing", { title: "A plan for your next chapter", plans: [] }),
  item("team", "Team", Team, "Marketing", { title: "Meet the team", members: [] }),
  item("recentFeed", "Content feed", Feed, "Dynamic", { title: "Latest stories", selectedItems: [] }),
  item("processSteps", "Process steps", Steps, "Marketing", { title: "How it works", steps: [] }),
  item("formEmbed", "Form", FormEmbed, "Dynamic"),
  item("videoShowcase", "Video showcase", Video, "Media"),
  item(
    "headingElement",
    "Heading",
    (p) => <Heading props={p} path="content" level={Number(p.block.level) || 2} />,
    "Content",
    { content: "A clear heading" },
  ),
  item("textElement", "Paragraph", (p) => <p {...attr(p, "content")}>{text(p.block.content)}</p>, "Content", {
    content: "Tell your story, one paragraph at a time.",
  }),
  item("richtextElement", "Rich text", RichText, "Content"),
  item("imageElement", "Inline image", ImageBlock, "Media"),
  item(
    "buttonElement",
    "Button",
    (p) => (
      <a className="kyro-action" href={safeStudioUrl(p.block.buttonData?.url)} {...attr(p, "buttonData.text")}>
        {text(p.block.buttonData?.text)}
      </a>
    ),
    "Content",
    { buttonData: { text: "Explore", url: "#" } },
  ),
  item("videoElement", "Video", Video, "Media"),
  item(
    "listElement",
    "List",
    (p) => (
      <ul>
        {list(p.block.items).map((v, i) => (
          <li key={v.id || i} {...attr(p, `items.${i}.text`)}>
            {text(v.text)}
          </li>
        ))}
      </ul>
    ),
    "Content",
    { items: [{ text: "Your first point" }] },
  ),
  item(
    "quote",
    "Quote",
    (p) => (
      <figure>
        <blockquote {...attr(p, "quote")}>{text(p.block.quote)}</blockquote>
        <figcaption {...attr(p, "author")}>{text(p.block.author)}</figcaption>
      </figure>
    ),
    "Content",
    { quote: "Words worth remembering", author: "Author" },
  ),
  item("gallery", "Gallery", Gallery, "Media", { images: [] }),
  item("accordion", "Accordion", FAQ, "Interactive", { items: [] }),
  item("tabs", "Tabs", Tabs, "Interactive", { items: [{ title: "First tab", content: { type: "doc", content: [] } }] }),
  item(
    "iconElement",
    "Icon",
    (p) => {
      const paths: Record<string, string> = {
        check: "m5 12 4 4L19 6",
        star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z",
        arrow: "M4 12h16m-6-6 6 6-6 6",
        heart: "M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 2 10 8 14 6-4 12-10 8-14",
      };
      if (p.block.icon && !paths[p.block.icon]) return <span {...attr(p, "icon")}><PickedIcon name={String(p.block.icon)} size={Math.max(16, Math.min(96, Number(p.block.size) || 32))} label={text(p.block.label) || "Icon"} /></span>;
      return (
        <svg
          {...attr(p, "icon")}
          width={Math.max(16, Math.min(96, Number(p.block.size) || 32))}
          height={Math.max(16, Math.min(96, Number(p.block.size) || 32))}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          role="img"
          aria-label={text(p.block.label) || text(p.block.icon) || "Icon"}
        >
          <path d={paths[p.block.icon] || paths.check} />
        </svg>
      );
    },
    "Content",
    { icon: "check", size: 32 },
  ),
  item(
    "badge",
    "Badge",
    (p) => (
      <span className="kyro-badge" {...attr(p, "text")}>
        {text(p.block.text)}
      </span>
    ),
    "Content",
    { text: "New" },
  ),
  item(
    "notice",
    "Notice",
    (p) => (
      <aside className="kyro-notice" role="note">
        <h3 {...attr(p, "title")}>{text(p.block.title)}</h3>
        <p {...attr(p, "content")}>{text(p.block.content)}</p>
      </aside>
    ),
    "Content",
    { title: "Good to know", content: "Share a helpful detail with your readers." },
  ),
];
