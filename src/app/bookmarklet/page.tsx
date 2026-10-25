import Link from "next/link";
import { requireUser } from "@/lib/auth";
import BookmarkletLink from "./BookmarkletLink";

export default async function BookmarkletPage() {
  await requireUser();
  return (
    <main className="sheet">
      <div className="topbar">
        <Link href="/">← All lists</Link>
      </div>
      <p className="eyebrow">Add from any shop</p>
      <h1>The wishlist bookmark</h1>
      <p className="lede">
        Save this as a bookmark. When you're looking at something in a shop, open the bookmark and the wish opens
        here with the name, picture, price and shop filled in. It reads the page in your own browser, so it also works
        on shops where pasting a link doesn't.
      </p>

      <BookmarkletLink />

      <div className="steps">
        <h2>On a computer</h2>
        <p>Show the bookmarks bar, then drag the “Add to wishlist” button onto it.</p>
        <h2>On an iPhone or iPad</h2>
        <ol>
          <li>Tap “Copy the code”.</li>
          <li>Bookmark any page in Safari, and name it “Add to wishlist”.</li>
          <li>Edit that bookmark and replace its address with the code you copied.</li>
          <li>On a shop page, open your bookmarks and tap it.</li>
        </ol>
      </div>
    </main>
  );
}
