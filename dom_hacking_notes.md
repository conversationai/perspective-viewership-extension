# DOM Hacking Notes

These are notes on hacking the DOM for each of the sites we support. The general
approach we take:

- Find comment blocks on the page. (A "comment block" includes username and
  avatar, upvote/downvote buttons, etc.)
- Extract the comment text from the comment block and score the text.
- Wrap the comment blocks in our own custom comment wrapper DOM element.
- Change what's displayed via the comment wrapper element based on the scores
  and the user's settings (whether the comment is hidden or shown, description
  of why, etc).


## Youtube

last updated: 2018-06-27

Basic structure of DOM elements:

- Each top-level comment is contained in a `ytd-comment-thread-renderer`
  element. If the comment has replies, they are also contained within this
  element (hence "thread").
- Comments themselves are contained in `ytd-comment-renderer` elements. This
  defines the comment block.
- Within each `ytd-comment-renderer`, the comment text is contained in a
  `yt-formatted-string` element with `id="content-text"`.
- If a comment has replies, the replies are contained within a
  `ytd-comment-replies-renderer` inside the `ytd-comment-thread-renderer`. Each
  reply comment is contained in a `ytd-comment-renderer` element with same
  properties as top-level comments, and also with an `is-reply` attribute.

Tricky bits:
- Visibility of replies within the ytd-comment-thread-renderer is controlled via
  buttons, "View all X replies" and "Hide replies". This causes the replies to
  be dynamically loaded.
- The comment text within each comment can be expanded, if the comment is long.
  The full text is loaded within th e `yt-formatted-string` element, but not all
  of it is displayed. There are "Read more" and "Show less" buttons within each
  comment.
- When replying to a comment, a div with `id="reply-dialog"` within the original
  comment's `ytd-comment-renderer` becomes populated with elements. When a reply
  is submitted, it becomes a new ytd-comment-renderer in the replies section, as
  usual.

Other notes:
- When scrolling to the bottom of the page, another batch of comments is loaded
  dynamically, appended to the list. The dynamic loading appears to be based on
  the index into the comments container, so we can't add siblings to the
  ytd-comment-thread-renderer elements.


## Facebook

TODO: do this

last updated: ??


## Twitter

TODO: do this

last updated: ??


## Reddit

TODO: do this

last updated: ??

Reddit has one of the more complicated DOM structures.


## Disqus

TODO: do this

last updated: ??
