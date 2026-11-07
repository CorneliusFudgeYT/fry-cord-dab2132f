<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- FryCord uses the existing channel-kind boards inside the channel route, with private upload pointers resolved to signed URLs; this keeps media access compatible with private storage.
- Account preferences and notifications live in Settings, and privileged staff actions call authenticated server functions; this separates user controls from owner-only access.
- Each mounted database-change subscription uses a unique topic; shared hooks otherwise reuse already-subscribed channels and crash server pages.
- Group chats use membership-scoped tables and authenticated group creation, keeping conversations private to invited members.
