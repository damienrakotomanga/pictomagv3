"use client";

import Image from "next/image";
import {
  ArrowUpRight,
  Clock3,
  Hash,
  Search as SearchIcon,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

export type SearchPostResult = {
  id: number;
  title: string;
  meta: string;
};

export type SearchSoundResult = {
  id: string;
  label: string;
  meta: string;
};

export type SearchCreatorResult = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  badge: string;
};

export function SearchPanel({
  open,
  query,
  onQueryChange,
  onClose,
  posts,
  creators,
  sounds,
  onOpenCreator,
  onOpenSound,
  onOpenPost,
}: {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  posts: SearchPostResult[];
  creators: SearchCreatorResult[];
  sounds: SearchSoundResult[];
  onOpenCreator: (handle: string) => void;
  onOpenSound: (soundId: string) => void;
  onOpenPost: (postId: number) => void;
}) {
  if (!open) {
    return null;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (value: string) => value.toLowerCase().includes(normalizedQuery);
  const filteredPosts = posts.filter((item) => !normalizedQuery || matchesQuery(`${item.title} ${item.meta}`));
  const filteredCreators = creators.filter(
    (item) => !normalizedQuery || matchesQuery(`${item.name} ${item.handle} ${item.badge}`),
  );
  const filteredSounds = sounds.filter((item) => !normalizedQuery || matchesQuery(`${item.label} ${item.meta}`));
  const filteredRecent = filteredPosts.map((item) => ({
    id: item.id,
    label: item.title,
    meta: item.meta,
  }));
  const filteredTrends = filteredSounds.map((item, index) => ({
    id: item.id,
    soundId: item.id,
    tag: item.label,
    posts: item.meta,
    accent:
      index % 2 === 0
        ? "linear-gradient(135deg, #f4f7ff 0%, #dce8ff 100%)"
        : "linear-gradient(135deg, #f8fbff 0%, #ebf2ff 100%)",
  }));
  const hasResults = filteredPosts.length > 0 || filteredCreators.length > 0 || filteredSounds.length > 0;
  const emptyTitle = normalizedQuery
    ? `Aucun resultat pour "${query}"`
    : "Aucun contenu n'est disponible pour le moment.";
  const emptyCopy = normalizedQuery
    ? "Essaie un createur, un titre de post ou un son plus large."
    : "Des que des publications arrivent, elles apparaissent ici.";

  return (
    <>
      <button type="button" aria-label="Close search" className="search-panel-backdrop" onClick={onClose} />

      <div className="search-panel-shell" role="dialog" aria-modal="true" aria-label="Search panel">
        <section className="search-panel">
          <div className="search-panel-header">
            <div>
              <p className="search-panel-eyebrow">Recherche</p>
              <h2 className="search-panel-title">Trouve un post, un son ou un createur</h2>
            </div>

            <button type="button" aria-label="Close search" className="search-panel-close" onClick={onClose}>
              <X size={18} strokeWidth={2.3} />
            </button>
          </div>

          <label className="search-panel-input-wrap">
            <SearchIcon className="search-panel-input-icon" size={20} strokeWidth={2.25} />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              className="search-panel-input"
              placeholder="Rechercher un createur, un post ou un son"
              autoFocus
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                className="search-panel-clear"
                onClick={() => onQueryChange("")}
              >
                <X size={16} strokeWidth={2.4} />
              </button>
            ) : null}
          </label>

          {hasResults ? (
            <div className="search-panel-grid">
              <section className="search-section">
                <div className="search-section-header">
                  <Clock3 size={16} strokeWidth={2.15} />
                  <span>Posts</span>
                </div>

                <div className="search-list">
                  {filteredRecent.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="search-list-item"
                      onClick={() => onOpenPost(item.id)}
                    >
                      <span className="search-list-icon">
                        <Hash size={16} strokeWidth={2.1} />
                      </span>
                      <span className="search-list-copy">
                        <span className="search-list-title">{item.label}</span>
                        <span className="search-list-meta">{item.meta}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="search-section">
                <div className="search-section-header">
                  <Sparkles size={16} strokeWidth={2.15} />
                  <span>Sons</span>
                </div>

                <div className="search-trend-stack">
                  {filteredTrends.map((trend) => (
                    <button
                      key={trend.id}
                      type="button"
                      className="search-trend-card"
                      style={{ background: trend.accent }}
                      onClick={() => onOpenSound(trend.soundId)}
                    >
                      <span className="search-trend-tag">{trend.tag}</span>
                      <span className="search-trend-posts">{trend.posts}</span>
                      <ArrowUpRight size={17} strokeWidth={2.15} className="search-trend-arrow" />
                    </button>
                  ))}
                </div>
              </section>

              <section className="search-section search-section-creators">
                <div className="search-section-header">
                  <UserRound size={16} strokeWidth={2.15} />
                  <span>Createurs</span>
                </div>

                <div className="search-creators">
                  {filteredCreators.map((creator) => (
                    <button
                      key={creator.id}
                      type="button"
                      className="search-creator-card"
                      onClick={() => onOpenCreator(creator.handle)}
                    >
                      <div className="search-creator-avatar">
                        <Image src={creator.avatar} alt={creator.name} fill sizes="48px" className="object-cover" />
                      </div>

                      <div className="search-creator-copy">
                        <span className="search-creator-name">{creator.name}</span>
                        <span className="search-creator-handle">{creator.handle}</span>
                      </div>

                      <span className="search-creator-badge">{creator.badge}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="search-empty-state">
              <SearchIcon size={24} strokeWidth={2.15} />
              <div>
                <p className="search-empty-title">{emptyTitle}</p>
                <p className="search-empty-copy">{emptyCopy}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
