-- Seed initial Bible verses
-- Popular verses for memorization

INSERT INTO public.bible_verses (reference, text, translation) VALUES
  ('John 3:16', 'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.', 'ESV'),
  ('Philippians 4:13', 'I can do all things through him who strengthens me.', 'ESV'),
  ('Psalm 23:1', 'The Lord is my shepherd; I shall not want.', 'ESV'),
  ('Proverbs 3:5-6', 'Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths.', 'ESV'),
  ('Romans 8:28', 'And we know that for those who love God all things work together for good, for those who are called according to his purpose.', 'ESV'),
  ('Jeremiah 29:11', 'For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.', 'ESV'),
  ('Matthew 6:33', 'But seek first the kingdom of God and his righteousness, and all these things will be added to you.', 'ESV'),
  ('Isaiah 41:10', 'Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.', 'ESV'),
  ('Psalm 119:105', 'Your word is a lamp to my feet and a light to my path.', 'ESV'),
  ('2 Timothy 1:7', 'For God gave us a spirit not of fear but of power and love and self-control.', 'ESV'),
  ('Joshua 1:9', 'Have I not commanded you? Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.', 'ESV'),
  ('Psalm 46:1', 'God is our refuge and strength, a very present help in trouble.', 'ESV'),
  ('Romans 12:2', 'Do not be conformed to this world, but be transformed by the renewal of your mind, that by testing you may discern what is the will of God, what is good and acceptable and perfect.', 'ESV'),
  ('Galatians 5:22-23', 'But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control; against such things there is no law.', 'ESV'),
  ('1 Corinthians 10:13', 'No temptation has overtaken you that is not common to man. God is faithful, and he will not let you be tempted beyond your ability, but with the temptation he will also provide the way of escape, that you may be able to endure it.', 'ESV'),
  ('Ephesians 2:8-9', 'For by grace you have been saved through faith. And this is not your own doing; it is the gift of God, not a result of works, so that no one may boast.', 'ESV'),
  ('Hebrews 11:1', 'Now faith is the assurance of things hoped for, the conviction of things not seen.', 'ESV'),
  ('James 1:2-3', 'Count it all joy, my brothers, when you meet trials of various kinds, for you know that the testing of your faith produces steadfastness.', 'ESV'),
  ('1 John 4:19', 'We love because he first loved us.', 'ESV'),
  ('Psalm 37:4', 'Delight yourself in the Lord, and he will give you the desires of your heart.', 'ESV')
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE public.bible_verses IS 'Seeded with 20 popular Bible verses for memorization';
