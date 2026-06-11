import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { Send } from 'lucide-react';
import { format } from 'date-fns';

export default function StoryComments({ storyId }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [text, setText] = useState('');

  const { data: comments = [] } = useQuery({
    queryKey: ['story-comments', storyId],
    queryFn: () => appClient.entities.StoryComment.filter({ story_id: storyId }, '-created_date', 50),
    enabled: !!storyId,
  });

  const { mutate: submitComment, isPending } = useMutation({
    mutationFn: (data) => appClient.entities.StoryComment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-comments', storyId] });
      setText('');
      setName('');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;
    submitComment({ story_id: storyId, user_name: name.trim(), text: text.trim() });
  };

  return (
    <section className="px-6 py-10 border-t border-temple-stone/20">
      <h2 className="font-cormorant text-2xl text-rain-cloud font-medium mb-8">
        Community Thoughts
      </h2>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="space-y-3 mb-10">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white/60 border border-temple-stone/30 rounded-xl px-4 py-3 font-inter text-sm text-rain-cloud placeholder:text-rain-cloud/35 focus:outline-none focus:border-wet-earth/50 transition-colors"
          required
        />
        <textarea
          placeholder="Share your thoughts or experience…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full bg-white/60 border border-temple-stone/30 rounded-xl px-4 py-3 font-inter text-sm text-rain-cloud placeholder:text-rain-cloud/35 focus:outline-none focus:border-wet-earth/50 transition-colors resize-none"
          required
        />
        <button
          type="submit"
          disabled={isPending || !name.trim() || !text.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-wet-earth text-white font-inter text-xs tracking-wide rounded-full disabled:opacity-40 transition-opacity active:scale-95"
        >
          <Send className="w-3 h-3" />
          {isPending ? 'Posting…' : 'Post Comment'}
        </button>
      </form>

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="font-inter text-xs text-rain-cloud/35 text-center py-6">
          Be the first to share your thoughts.
        </p>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex gap-4"
              >
                {/* Avatar initial */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-temple-stone/40 flex items-center justify-center">
                  <span className="font-cormorant text-sm text-wet-earth font-medium">
                    {comment.user_name?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-inter text-xs font-medium text-rain-cloud">
                      {comment.user_name}
                    </span>
                    <span className="font-inter text-[10px] text-rain-cloud/30">
                      {format(new Date(comment.created_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="font-inter text-sm text-rain-cloud/65 leading-relaxed">
                    {comment.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}