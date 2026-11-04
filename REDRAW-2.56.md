# 2.56 — перерисованные эмоции

Три эмоции перерисованы встроенным инструментом imagegen от нейтрального портрета durak-neutral-v5.webp. Нейтральная поза сохранена. Итоговые новые изображения: assets/durak-thinking-v6.webp, assets/durak-win-v6.webp, assets/durak-lose-v6.webp. PNG-результаты упакованы в WebP quality 94 с alphaQuality 100, без изменения размера и без программного склеивания головы и туловища.

Все маски головы/тела, отдельный слой туловища и SVG-маски из 2.55 удалены. Переход цельных изображений — общий с покером createPortraitFade, opacity, 320 мс. WebGL и покадрового JS для портрета нет.

## Задания на перерисовку

Общие ограничения: identity-preserve, исходный нейтральный портрет как точная основа. Сохранить положение головы, основание шеи, воротник, силуэт/высоту плеч, складки одежды, руки, пальцы и карты; тот же персонаж, борода, волосы, рисовка, освещение и палитра. Формат 1536×1024, прозрачность, без текста. Только мимика и направление взгляда, без наклона/смещения головы и тела.

- Thinking: eyes looking down at cards, lowered upper eyelids, mildly concentrated brows, relaxed closed lips. No nod or head movement.
- Win: subtle warm pleased smile showing a little upper teeth, gently lifted cheeks, gaze toward viewer. Facial expression only.
- Lose: restrained disappointment, slightly raised/drawn inward inner eyebrows, gently lowered gaze, relaxed closed lips with subtly sad corners. No crying, anger or dramatic slump.

Первый пробный thinking с небольшим наклоном отклонён из-за большего расхождения плеч. В сборку включён повторный вариант без наклона головы.

## Проверки и ограничения

15 тестов портрета и общего fade прошли. Визуально осмотрены все новые эмоции. На пяти контрольных строках y=520,600,700,850,950 максимальные расхождения левого/правого края тела по alpha>=128 относительно нейтрального: thinking 3px, win 1px, lose 2px. Это выборочная проверка контура, не гарантия полного попиксельного совпадения и не замер FPS.

Физический iPhone и браузерная анимация в Safari не проверены. Размеры картинок не уменьшены. Предыдущие FIX/PERFORMANCE-документы относятся к историческим версиям.
