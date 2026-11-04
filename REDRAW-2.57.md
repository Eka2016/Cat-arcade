# 2.57 — новый набор по референсу IMG_8496.PNG

Все четыре портрета перерисованы встроенным imagegen. Референс пользователя задаёт лицо, волосы, бороду и анатомию. Старая нейтральная поза задаёт синюю кофту с круглым воротом, руки и карты. Белая рубашка и диагональная штриховка референса не переносились.

Новый нейтральный портрет — единая основа для трёх эмоций. В задумчивости опущен взгляд без наклона головы. Победа — спокойная улыбка, поражение — сдержанное огорчение. Разделение головы/тела не используется. Единый внешний контур нейтрального спрайта применяется ко всему портрету после смешивания: это обрезает полупрозрачные ореолы новых кадров без отдельной маски головы/шеи. Переходы цельных портретов сохранены: opacity 320 мс, общий с покером createPortraitFade.

## Задания генерации

Neutral: follow image 1 character face, dark brown hair, angular adult jaw, beard shape, brown eyes, clean painterly illustration; image 2 supplies blue crew-neck sweater, arms/hands/cards and composition. Natural head-neck-shoulder connection, head upright above torso, relaxed neutral expression. No distorted jaw, elongated throat, diagonal lines or white shirt.
Thinking: edit neutral master; eyes clearly down at cards, mild concentrated brows, mouth relaxed; exact head orientation, neck, collar, shoulders, clothing, hands, cards and framing unchanged. No nod or tilt.
Win: edit neutral master; subtle warm smile with a little upper teeth, relaxed brows, eyes toward viewer. Keep head/neck/body registration.
Lose: edit neutral master; restrained mild disappointment, slightly raised inner brows, lowered gaze, subtly sad closed mouth. No slump, tears or anger. Keep head/neck/body registration.
All: 1536×1024 RGBA, same identity and style, transparent background, no text.

## Файлы и проверки

assets/durak-{neutral,thinking,win,lose}-v7.webp. PNG-результаты преобразованы в WebP quality 94 / alphaQuality 100 без изменения размера. Файлы предыдущих версий оставлены как исторические, но не загружаются этой сценой.

Все четыре результата визуально осмотрены; 15 тестов портрета и переходов прошли. Размеры, прозрачность и новые пути проверены. Это не проверка реальной анимации Safari; физический iPhone не использовался. Попиксельное совпадение с референсом или отсутствие любых визуальных дефектов не гарантируется.
