/** Playground document used by "Try Smart Assist" on the About page. */
export const SAMPLE_DOCUMENT = `# Smart Assist playground

Move your cursor around this document — suggestions appear at the bottom of the editor.
Press **Tab** to accept, **Esc** to dismiss.

## 1. Code blocks without a language

The block below has no language tag. Click outside it and Smart Assist will suggest one.

\`\`\`
interface User {
  id: string
  name: string
}
\`\`\`

## 2. Structure that almost worked

**Installation**

#Getting started

-this should be a list item

## 3. Smart paste

Copy the lines below and paste them anywhere — you'll be offered a Markdown table.

name,role,city
Ana,Engineer,São Paulo
Bruno,Designer,Rio

## 4. Readability

Switch to the preview (or look at the left pane): each long \`##\` section gets a small dot showing how easy it is to read. Hover it for details. Short sentences and plain words make the dot green; long, winding sentences packed with multisyllabic terminology and nested qualifications, like this one, push it toward amber or red.
`
