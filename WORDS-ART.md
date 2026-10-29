# Иллюстрации занятия английским · 2.6

Персонаж создан в 2.5 встроенным imagegen по референсу пользователя IMG_8180.png. В 2.6 фон точечно отредактирован тем же инструментом: заменён диван. Для этих иллюстраций не использовалось подключение Таверны или пользовательский ключ. В расширении это обычные локальные файлы; они не генерируются заново во время игры.

| Файл | Размер | Назначение |
|---|---|---|
| [assets/words-penthouse-v2.webp](assets/words-penthouse-v2.webp) | 960 × 640, RGB | Неподвижный пентхаус; обновлённый тауповый диван с прострочкой и латунным акцентом |
| [assets/words-tutor-reactions.webp](assets/words-tutor-reactions.webp) | 1254 × 1254, RGBA | 2 × 2: спокойный, одобряющий, поддерживающий, сосредоточенный |

Фон уменьшен для небольшого игрового окна и сохранён в WebP с качеством 90. Атлас реакций сохранён без изменений, в WebP без потерь с исходной альфой. Каждый кадр показывает целого персонажа; маски и подмена нижней части тела не используются. Пять карточек на столике нарисованы средствами интерфейса, а плавное перемешивание и подача выполняются браузером. Старый фон и атлас отдельных поз рук больше не входят в архив. Композиция не использует видео, внешние шрифты или музыкальные файлы.

Ниже приведены исходные промпты, режимы создания и финальная правка дивана. Для фона 2.6 выбран режим точечного редактирования, без новых вариантов или повторных попыток; исходная комната из 2.5 использована как цель правки. Реакции используют прежний атлас, фиксированную геометрию и плавные переходы целого портрета.

## Исходный пентхаус · 2.5

```text
Use case: stylized-concept. Asset type: background illustration for a small cozy English flashcard game.
Create a beautiful expensive but cozy modern penthouse living room at blue-hour dusk. Painterly editorial / western visual-novel illustration, confident visible brushwork, precise clean forms, realistic anatomy not applicable, no pixel art, no anime, not a photograph. Wide landscape 3:2 composition.
A luxurious low cognac-brown velvet sofa occupies the lower left and center, its back at roughly half frame height. A muted dark olive cushion. Warm walnut wall paneling, a softly glowing brass floor lamp on the left, a small side table and one closed book. Behind the sofa are broad windows with a refined distant city skyline, tiny warm city lights and a dusty peach-to-blue evening sky. The mood is intimate, peaceful, affluent and lived-in, like a private study evening at home. Restrained dark teal shadows, warm amber lighting, natural warm neutrals, brass accents. Enough illumination to read forms clearly at mobile scale.
Camera at eye level of a guest sitting opposite the sofa; calm frontal perspective, no fisheye. Leave the sofa seat on the left available for a separately composited seated man. On the right keep a calm uncluttered area of upholstery/window/dark wood, where a UI flashcard will later be placed. No people, no hands, no cards, no writing, no UI, no watermark or logos. One coherent room, no collage or decorative frame.
```

## Правка дивана · 2.6

Результат: `assets/words-penthouse-v2.webp`. Режим: `precise-object-edit`, редактирование исходного фонового изображения.

```text
Use case: precise-object-edit. Asset type: corrected background illustration for a cozy luxury penthouse flashcard game.
Input image 1 is the EDIT TARGET. Preserve its room, framing, perspective, warm brass floor lamp, walnut shelving and wall paneling, plants, windows, city skyline at dusk, rug, coffee table and overall soft warm lighting. Change only the SOFA and its cushions/throw, keeping exactly the same placement and size so a separately composited seated character will still fit.
Replace the conspicuous rumpled orange velvet couch with a genuinely high-end contemporary sofa: beautifully tailored warm mushroom / dark champagne-taupe premium leather or dense elegant upholstery, deep comfortable seats, refined subtle channel tufting on the back, softly rounded substantial armrests, an understated dark walnut plinth with a thin brushed-brass detail. Rich and expensive but inviting, not a throne or a flashy gold palace. Use two restrained matching cushions with one muted dark olive accent. Remove the loosely draped rumpled blanket as part of the sofa correction. Keep the sofa color calm and harmonious with the dark wood, brass and teal-blue evening windows, much less saturated than the old orange.
Maintain a crisp painterly editorial illustration with rich natural material textures and coherent warm/cool lighting; no pixel art or anime. The sofa must belong naturally to this existing room. No people, text, logos, cards, UI or watermarks. Keep the entire rest of the room unchanged and do not crop or move the camera.
```

## Реакции персонажа

```text
Use case: identity-preserve. Asset type: a transparent 2x2 CHARACTER REACTION SPRITE ATLAS for an English flashcard tutor.
Input image 1 is the character identity and painterly style reference. Transform this man into the described seated tutor, retaining his recognizable angular masculine adult face, strong straight nose and brows, swept-back slightly wavy black hair with loose forelock, clean-shaven face, natural warm light skin, mature proportions and elegant dark clothing. Do not copy the original green cast onto the skin.
OUTPUT: exactly four equal SQUARE cells, a strict 2 columns x 2 rows grid, transparent alpha background in every cell; no background scene or sofa, no text, labels, grid lines, shadows outside the figure or watermarks. Ideally a large square image. Each cell contains the SAME waist-up seated man, identical framing, scale, camera, head position, shoulders, clothing, arms and hands. Leave a small clear margin around the silhouette in each cell; no part crosses a cell edge.
Pose in every cell: seated comfortably on a sofa that will be composited later, torso almost frontal with a slight three-quarter turn toward the viewer's right, both elbows naturally low, forearms over lap. Both anatomically correct hands clearly visible just above his lap, holding a SMALL squared stack of warm ivory vocabulary flashcards with dark olive backs; no playing-card suits, no text. Left palm supports the stack, relaxed right fingertips rest along its top edge, ready to shuffle. All five fingers correctly formed and no crossed/fused wrists. Hands belong naturally to the jacket sleeves. Simple relaxed tailoring: dark charcoal jacket over an ivory dress shirt, loosely knotted muted dark rust tie, clean lapels, restrained natural folds, dark jacket lining. Keep the hands and deck in the same resting pose and position in all four cells. Warm lamp light from upper left, very subtle cool evening rim light.
The figure fills about 90% cell height, head in upper third, hands near lower third, shown down to just below the hands so torso and sleeves are complete. Crisp detailed painterly illustration in the reference style, no pixelation, no anime, no chibi, no oversharp plastic photo look.
Cell top-left: calm attentive neutral expression, mouth closed, looking toward the learner/camera.
Cell top-right: subtle approving expression, a very small warm closed-mouth smile, relaxed brows, not laughing.
Cell bottom-left: supportive thoughtful expression after a mistake, kind patient eyes, slight compassionate brow, no anger, no pitying grimace.
Cell bottom-right: concentrated expression looking gently down toward the deck, lips neutral, same head silhouette, preparing a round.
Critical: only subtle facial expression/gaze changes across the cells. The man must not shift, bounce, change pose, outfit, size or lighting. Genuine transparent background.
```
