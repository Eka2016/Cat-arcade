# Графика игр и реакции · 1.31.2

## Шахматы · библиотека императора

Используются прежние живописные библиотека и император из версии 1.18, без пиксельной обработки. Два ресурса созданы встроенным ImageGen. Референс персонажа — `IMG_0808.png`, атмосфера интерьера — `IMG_8155.png`. Вместо кабинета создана библиотека с книжными галереями, камином, свечами, готическим окном и алым небом. Референсы пользователя в архив не включены.

| Файл проекта | Размер | Объём |
|---|---|---:|
| `assets/chess-imperial-library.webp` | 768 × 768 | 157 038 байт |
| `assets/chess-emperor-reactions.webp` | 1536 × 1024, 2 × 2, прозрачный | 1 614 798 байт |

Фон уменьшен с 1254 × 1254 и упакован в WebP с качеством 92; прозрачный атлас упакован без потерь и без изменения размера. Отдельные исходники ImageGen: `generated_images/exec-1fc883c3-a0b4-4ed4-8412-11d87a8342cc.png` и `generated_images/exec-b1d02714-8274-4398-a5a6-093d0f655796.png` (рабочие пути создания, сами PNG в ZIP не включены). Подготовка WebP не перерисовывает лицо, одежду или фон. Суммарный объём двух ресурсов — 1 771 836 байт; распакованные изображения — около 8,3 МиБ RGBA.

Кадры по строкам: №0 спокойный, №1 задумчивый, №2 собственная победа императора, №3 его поражение. Ничья использует №0. У каждого состояния цельный портрет; лица по частям не собираются. Каждый из четырёх цельных кадров закреплён на собственном неподвижном слое. В 1.23 переходы занимают 440 мс для задумчивости, 560 мс для спокойного выражения и 620 мс для результата, в изолированной группе с plus-lighter. Контроллер chess-portrait.js выдерживает задумчивость минимум 1250 мс активного времени и откладывает возврат минимум на 420 мс после ответа соперника. Быстрый следующий ход отменяет ожидающий возврат, а победа и поражение имеют приоритет. Эти небольшие задержки касаются только портрета: игровой поиск и очередь ходов не замедляются. При паузе таймер останавливается; при новой партии или уничтожении отложенная реакция отменяется. При быстром новом переходе все слои начинают с текущей прозрачности, не переставляя видимый кадр и не показывая фон в середине смены. Корпус размещён на одном якоре; постоянного цикла перерисовки нет. Уменьшение движения отключает переход. В 1.24 из группы портрета убраны фильтр тени и нижняя маска, требовавшие дополнительной композиции, а активные слои получают will-change: opacity. Исходные изображения не изменены. Расчёт следующего шахматного хода выполняется отдельно от интерфейса. Библиотека и портрет не содержат нарисованных игровых фигур: реальная доска, ходы и выбор превращения остаются в коде.

Доска оформлена CSS в тёмных бордовых и каменных тонах с бронзовой рамой. Шесть классических силуэтов в `chess-pieces.js` нарисованы непосредственно кодом как плавные SVG на сетке 48 × 64: светлая кость и тёмный обсидиан со сдержанными металлическими деталями. Эти же рисунки используются в выборе превращения пешки. Пиксельные фигуры и системный шахматный шрифт не используются. Изображения не отправляются модели.

### Запрос для библиотеки

Use case: stylized-concept.
Asset type: background plate for a real playable chess mini-game in a small SillyTavern extension, not a UI mockup.
Input image 1 is an ATMOSPHERE / ARCHITECTURE REFERENCE only. Create a new interior based on its Gothic pointed windows, very dark wood, book-lined architecture, red ember sunset and distant spires. Do not copy the office arrangement or the cloaked person.

Primary request: a cozy private imperial LIBRARY in a peculiar underworld, where the player sits across a chess table from a separately composited horned emperor who loves reading. A richly furnished reading room with tall dark-walnut bookshelves filled with old leather-bound books, an intimate reading alcove, Gothic stone arches and a narrow pointed window showing a muted crimson-coral ember sky and distant palace silhouettes. A small hearth glow and warm amber candlelight illuminate brown leather, walnut and restrained aged-brass details. Burgundy curtains, quiet ornate craftsmanship, dignified and comfortable, sophisticated dark fantasy. The room should unmistakably be a library for reading and chess, not an administrative office. No desk covered in documents, no paperwork, quills or piles obscuring the table.

Composition: square, full bleed, seated player's eye level looking straight across an elegant substantial dark wooden chess table. Upper 45 percent: library and central clear space where a separate seated character sprite will be placed. Place bookcases on both sides and keep the center readable and uncluttered behind the character. Lower 55 percent: broad EMPTY calm dark-walnut tabletop for an actual interactive 8-by-8 chessboard added by code. Keep the tabletop softly lit and mostly plain, with subtle grain and a thin antique brass edge. Do not paint a chessboard or any chess pieces: the real board will be interactive. The horizon/table boundary supports the character's resting forearms.

Style: crisp refined painted fantasy game environment, clean edges, detailed but controlled, no pixelation, no fog, no visual noise. Match the reference's Gothic warmth and red exterior light while making the room genuinely cozy and bookish. Interior candlelight should be amber, not an overwhelming red wash. No modern objects.
Constraints: absolutely no people, characters, silhouettes, body parts, creatures, skulls, gore, torture devices, floating books, readable lettering, chess pieces, chessboard, playing cards, dice, buttons, counters, frames, logos, watermarks or UI. This is only the complete illustrated room and empty gaming tabletop.

### Запрос для четырёх эмоций

Use case: identity-preserve.
Asset type: ONE genuinely transparent four-expression character sprite sheet for a playable chess game.
Input image 1 is the IDENTITY AND COSTUME REFERENCE for the SAME adult male horned emperor. Create seated chess-opponent portraits of him, preserving his recognizable face, pale ash-ivory skin, narrow ember-red eyes, long silver-grey hair with loose forehead strands, exactly two tall slender black curved horns, the fine antique-gold forehead ornament, black/dark charcoal high-collared imperial robes, subtle gold embroidery, mantle and restrained pale fur edging. Keep the mature, refined fantasy illustration look, crisp eyes and clean natural anatomy. Do not turn him into a different person, an old bearded king, a cartoon devil or a chibi.

Composition: exact TWO-COLUMN by TWO-ROW sprite sheet, four equal LANDSCAPE cells, each cell aspect 3:2; total sheet aspect 3:2, ideally 1536 by 1024. In each cell show the same emperor seated upright across an unseen chess table, from the COMPLETE tips of both horns down to both forearms and relaxed hands near the lower edge. Keep a little transparent padding above the horns. His forearms rest naturally on the unseen table; hands are calm and anatomically clear. He faces the player, with the SAME shoulders, body silhouette, size, camera and hand positions in all four cells. His long silver hair falls naturally over the robes; dark sleeves and hands remain clearly separated. No moving the whole body between expressions. Do not crop horns, hair, hands, elbows or shoulders. No chair or table in the cutout.

Four restrained, distinct, dignified expressions:
TOP LEFT: neutral, composed, attentive, quietly imperious, lips relaxed.
TOP RIGHT: thinking over his chess move, eyes slightly down toward the board, subtly drawn brows, thoughtful closed mouth.
BOTTOM LEFT: his OWN victory, a subtle pleased confident smile, slight warmth and satisfaction in his eyes, no broad grin.
BOTTOM RIGHT: his OWN defeat, a restrained disappointed frown, slightly lowered gaze and wounded pride, no tears or exaggerated anger.
Change only the facial expression and a small natural eye/head inclination; body anchors must remain identical.

Lighting and materials: warm amber candlelight with very subtle crimson rim light appropriate to a cozy imperial Gothic library in an underworld. Preserve pale neutral skin and silver hair; no heavy red wash, no green tint. Dark layered cloth has a few soft natural folds, not busy crumpling or random gold patterns. Refined, sharp, softly painted fantasy game character rendering, sophisticated adult proportions, not photorealistic, not pixelated, not anime/chibi, no noise.
Background: actual transparent alpha over the ENTIRE sheet; no painted checkerboard, no white, black or colored background. No environment, book, chessboard, chess pieces, cards, throne, flames, secondary figures, text, labels, grid lines, panel borders, speech bubbles, logo or watermark.

### Проход для прозрачных кадров

Use case: background-extraction.
Input image 1 is the EDIT TARGET, a four-expression 2-by-2 character sheet. Correct ONLY background transparency and tight framing, preserving the painted characters.

Remove ALL of the brown/grey glowing backdrop behind and around the four emperors, including the diffuse halos and every rectangular background fill. The result must contain ONLY the four character cutouts on truly clear transparent alpha. All empty space between and around characters must be fully transparent, including directly behind horns, hair, head, shoulders and elbows. Do not replace the backdrop with white, black, checkerboard, a color, a glow, smoke or new scenery. Preserve warm highlights that are actually ON the robes, fur, hair and skin. Do not fade the characters themselves.

Maintain the exact two-column by two-row layout with equal landscape 3:2 cells. Give each character a small clear transparent margin above the complete tips of both horns and along both outside sleeve edges so no horns or sleeves get cut by a cell border. Scale each WHOLE figure down uniformly by the same small amount if needed to create that margin; do not shrink just heads or change body proportions. Keep forearms aligned at the same bottom baseline in all four cells. Preserve BOTH horns completely in every cell.

Strictly preserve this same emperor's exact face, silver hair, ember-red eyes, pale skin, ornate central forehead ornament, dark robes, gold embroidery, mantle, fur, clasped hands, pose and the SAME four facial expressions: top left neutral, top right thinking, bottom left restrained pleased smile, bottom right disappointed. Do not redraw the costume, facial expressions, hands or character identity. No outlines around the cutout, no text, frames, labels, chess pieces, table, chair or additional objects. Only extract the clean character cutouts and add necessary transparent breathing room.

## Графика других игр


Ресурсы подготовлены встроенным ImageGen по референсу пользователя и предыдущей сцене. Пиксельные ресурсы таверны упакованы в WebP без потерь после подготовки размеров с резкими границами. Новый фон ДНД выполнен в живописном стиле и упакован в WebP с качеством 86.

| Ресурс | Размер | Файл |
|---|---|---:|
| `assets/tavern-table-pixel.webp` | 768 × 768 | 559 104 байта |
| `assets/opponent-reactions.webp` | 1536 × 640, сетка 3 × 2 | 777 312 байт |
| `assets/forest-stump-topdown.webp` | 768 × 768 | 185 490 байт |

Атлас сохраняет шесть исходных кадров по 512 × 320. В версии 1.10.0 используются четыре: №0 (обычное лицо), №5 (задумчивость на ходу Дрейка и до зачётного выбора игрока), №3 (победа Дрейка), №4 (поражение Дрейка); нумерация с нуля. Используются цельные кадры без наложения частей лица. Атлас не менялся и не перезагружается при смене выражения.

Оба ресурса вместе занимают 1 336 416 байт на диске и примерно 6 МиБ в распакованном RGBA-представлении самих изображений; браузеру также нужна память для интерфейса. В 1.9.0 фон ДНД заменён видом на пень строго сверху: assets/forest-stump-topdown.webp, 768 × 768, 185 490 байт. Новый файл меньше прежнего лесного фона на 125 662 байта. Карты, доски, домино и слова используют CSS, текст и стандартные символы; для этих игр новые фоны и портреты не добавлялись. На конкретном телефоне пользователя замеры не проводились. Постоянной анимации фона, видео или WebGL нет. Все три изображения встроены в автономный `demo.html`. Фон ДНД добавляет примерно 2,25 МиБ распакованных RGBA-данных при типичном представлении браузера. Кубик — точная SVG-геометрия с динамическим числом и древесными оттенками; он не запечён в картинку.

## Пень сверху · запрос для ДНД

Создан встроенным ImageGen, затем уменьшен до 768 × 768 и подготовлен как WebP. Файл проекта: `assets/forest-stump-topdown.webp`. Кубик и его число добавляет интерфейс; на изображении их нет.

Use case: stylized-concept. Asset type: a square background texture for a small interactive d20 dice game inside a SillyTavern widget, final display about 300 by 300 pixels. Create a clean, restrained, original dark fantasy RPG scene inspired by the painterly natural materials and elegant atmosphere of Baldur's Gate 3. CAMERA: perfectly overhead, straight down at 90 degrees, orthographic. SUBJECT: one broad, flat cut tree stump, almost round with a naturally uneven bark rim, centered exactly at the center of the square; the flat cut wood takes about 82 percent of the image width. Its softly visible growth rings and a few fine natural radial cracks read clearly at small size, but the center is calm and uncluttered, a place on which an interactive wooden d20 will be overlaid later. Environment: only a narrow surrounding border of quiet dark olive forest earth with a little sparse moss at the edges; no forest vista, no horizon, no tall trees, no branches overhead. Lighting: gentle warm light from upper left, subdued earthy walnut and honey-brown wood, soft green-black perimeter, natural subtle shadows. Medium: polished painterly game environment illustration with crisp readable silhouettes and restrained texture, not pixel art, not photorealistic, no grain or AI noise. Minimalist composition, no busy foliage, props, decorations, runes, carvings, mushrooms, candles, characters, hands, creatures, dice, letters, numbers, text, logos, watermark, borders, UI panels or buttons. Render only the empty stump surface and its quiet immediate surroundings. Square full-bleed asset.

## Запрос для фона

Use case: precise-object-edit. Asset: sharp pixel-art background plate for a real tavern dice game. Edit the supplied tavern scene: REMOVE THE MAN ENTIRELY, including his hair, body, arms, hands and the die he holds, and reconstruct the wooden wall and shadowed arch behind him. Keep the warm candlelit tavern, candle sconces at upper left, barrel at right, and broad empty wooden tabletop in the foreground. Preserve the square composition and the far edge of the table at exactly 58% of image height. The bottom 42% remains an unobstructed tabletop of horizontal planks. Sharp high-resolution 16-bit pixel art with clean square clusters and clearly readable wood grain; warm amber illumination, no blurry haze or smeared detail. Absolutely no people, silhouettes, character parts, foreground dice, interface, writing, numbers, labels, frame, or watermark. The foreground must be ready for a separate transparent character sprite sitting behind the table, with real interactive dice placed over the tabletop by code. Keep the recognizable warm palette and perspective of the reference.

## Запрос для набора выражений

Use case: identity-preserve. Asset: ONE transparent sprite atlas for the opponent's facial reactions in a real pixel-art dice game. Image 1 is the character identity and pixel-art pose/clothing reference from the current game. Image 2 is the original identity reference for the same adult man. Produce a WIDE 3-column by 2-row SPRITE SHEET, SIX equally sized landscape cells. Target total aspect ratio 12:5, each cell aspect 8:5. The backgrounds of ALL SIX cells must be genuinely transparent, not white, not black, not checkerboard. No dividers, cell borders, labels, writing or UI. In each cell draw the SAME recognizable adult human male seated, from the top of his hair to his waist, with both forearms and hands visible at the bottom edge. Dark swept wavy hair, strong brows, angular face, light warm skin, hazel eyes, high collared dark forest-green tunic with subtle gold embroidery and blue brooch. Crisp detailed but clean 16-bit pixel art, clear face, lit by warm candlelight from left. NOT anime, NOT chibi, NOT childish. The torso, clothes, silhouette, camera, size, hair, hands, and exact seated pose must be identical in all six cells: one hand loosely holding a small die, the other resting at the table edge, but DO NOT draw the actual table, chair, background, candles or environment. Change ONLY facial expression and tiny head inclination, without shifting head position. Keep generous transparent separation between all cells, while all faces and elbows remain inside their own cell. Read cells left-to-right, top row then bottom row: 1 NEUTRAL focused attentive expression; 2 GOOD ROLL visibly pleased with a small confident smirk and relaxed brows; 3 BAD ROLL visibly annoyed and disappointed, brows pinched and lips pressed, restrained adult frustration; 4 VICTORY clearly satisfied triumphant warm smile, eyes bright, dignified and not exaggerated; 5 DEFEAT clearly disappointed, lowered gaze and tightened mouth, no tears, distinct from the temporary annoyance in cell 3; 6 THINKING one eyebrow raised, eyes studying the dice, lips slightly pursed. Every frame must show the same man, same alignment and same pose, with expressions clearly distinguishable even on a small game screen. This is an animation sprite sheet, not a collage or character design page.


## Покер · современная городская сцена · 1.15

Городская сцена и первоначальный атлас созданы встроенным ImageGen по референсам персонажа пользователя. В 1.17.1 атлас заменён именно выбранным пользователем файлом `IMG_8151(1).png` (1672 × 941): более чёткие глаза, обновлённые рукава, тёмная подкладка и аккуратные манжеты. Исходный SHA-256: `ea86cb202aec4827a0619223951baa841ce7c35aafa8a3017c10438e753a92cf`. При подготовке прозрачным стал только связанный с внешней границей почти чёрный фон. Два ряда размещены в равных прозрачных ячейках 836 × 471 без обрезки рисунка и без масштабирования: верхний ряд исходника до строки 467, нижний — начиная со строки 467. Цвета всех видимых пикселей сохранены; лицо, волосы, кожа и одежда кодом не перерисовывались. WebP упакован без потерь.

| Файл проекта | Размер | Объём |
|---|---|---:|
| `assets/poker-city-lounge.webp` | 768 × 768 | 126 056 байт |
| `assets/poker-opponent-reactions.webp` | 1672 × 942, 2 × 2, прозрачный | 761 652 байта |

Кадры слева направо, сверху вниз: №0 обычный, №1 задумчивый, №2 победа соперника, №3 поражение соперника. Используются цельные изображения верхней половины тела. CSS выравнивает прозрачные поля кадров относительно общего центра тела: горизонтальные поправки −4,904%, +5,742%, −4,904%, +5,622%, нижний ряд с вертикальными поправками +0,212% и +0,212%. В 1.21 каждый из четырёх кадров закреплён на отдельном неподвижном слое. Между ними — плавный переход прозрачности на 320 мс в изолированной группе с plus-lighter; быстрый новый переход начинается с текущих весов всех слоёв. Поэтому ещё видимый кадр не переставляется и фон не просвечивает в середине перехода; постоянной анимации и цикла перерисовки нет. Уменьшение движения отключает переход. Закрытая рука не участвует в выборе выражения: используются только очередь хода и фактический исход раздачи/матча.

Фон и атлас загружаются из папки расширения. Карты, фишки и действия — интерактивные элементы интерфейса, они не нарисованы на фоне. Эти ресурсы в сумме занимают 887 708 байт; их распакованные изображения — около 8,3 МиБ RGBA без учёта интерфейса и остальных ресурсов.

### Запрос для городской сцены

Use case: stylized-concept. Asset type: background plate for a small premium poker game in a SillyTavern extension. Create a square, full-bleed illustrated modern penthouse poker lounge at night. Camera: seated player's eye level, straight across the poker table toward a floor-to-ceiling window and a warm, elegant contemporary city skyline with a few softly lit high-rise buildings. The room is expensive and tasteful: dark walnut, understated champagne brass, warm ivory architectural lighting, restrained charcoal furniture, no visual clutter. The upper 42 percent is the lounge/window background and clear central space for a separately composited opponent. The lower 58 percent is a broad empty deep bottle-green felt poker table, gently seen in perspective, with a thin curved padded dark leather rail at its far edge. The felt area must be calm and unobstructed for real interactive cards and counters added by code. Polished crisp high-resolution pixel-art game illustration, clean detailed pixel clusters, premium believable materials, controlled warm highlights, modern urban atmosphere, no fog, no noise. No people, silhouettes, hands, faces, playing cards, chips, dice, readable text, logos, numbers, buttons, borders or UI. The image is an actual game background asset, not a screenshot or mockup.

### Запрос для атласа персонажа

Use case: identity-preserve. Asset type: ONE genuinely transparent four-frame character sprite sheet for the opponent in a luxury modern poker game. The three input images are identity/clothing references for THE SAME ADULT MAN, not edit targets. Preserve his recognizable angular handsome face, strong straight brows, narrow grey-hazel eyes, straight nose, dark almost-black hair swept back with a few loose strands on the forehead, mature realistic proportions. Skin MUST be naturally light ivory-beige with subtle pink warmth and believable neutral shadows: no green, olive, yellow or sickly tint. Clothing: immaculate charcoal-black three-piece tailored suit, crisp white shirt, deep charcoal-plum silk tie with subtle silver tie bar; suit jacket worn normally or neatly draped as in the references, same choice in every frame. Medium: crisp refined hand-painted pixel-art game portrait, highly readable eyes and mouth at a small display size, sophisticated adult design, not anime, not chibi, not photorealistic. Layout: exact TWO-COLUMN BY TWO-ROW grid, four equal LANDSCAPE cells, every cell aspect 16:9, total sheet aspect 16:9, preferably 2048x1152. In each cell show the same man seated across a poker table, centered from top of hair to lower chest and both forearms at the bottom. Hands resting calmly in the same positions; no cards, dice, chips, table, chair or environment in the sprite. Absolutely identical camera, scale, head center, shoulders, torso silhouette and hand placement in ALL four cells. Keep every part inside its own cell with transparent padding around it. Change ONLY the facial expression. Top-left: neutral self-possessed attentive, relaxed mouth. Top-right: thinking, eyes slightly lowered and focused, brows drawn subtly, lips gently pressed. Bottom-left: winning, distinctly pleased and confident restrained smile, bright eyes. Bottom-right: losing, distinctly disappointed and mildly frustrated, gaze lowered, brows pinched, mouth tightened, no tears. The four expressions should be immediately distinguishable yet dignified. Background of the ENTIRE image and all cells must be actual transparent alpha, not white, not black, not a checkerboard. No labels, frames, grid lines, writing, watermark, speech bubbles or UI.



## Правда / действие · 1.24

Зелёная друидская тема сохраняет спокойную стилистику светлой бумаги и тонкого декора: папоротниковые и шалфейные оттенки, тёплый кремовый, мягкие растительные линии. Звёзды и луна заменены листом и веткой папоротника на жетоне; вокруг — стебли и небольшие листья, на закрытой карточке спит кот на широком листе. Рамки и символы выполнены HTML/CSS/SVG. Новых растровых изображений и внешних ресурсов нет. Карточки «Правда» светло-зелёные, «Действие» — кремово-оливковые; список, редактор и круговая стрелка повторной игры используют ту же палитру. Декор неподвижен. Вращение жетона — одна конечная анимация, останавливаемая при паузе. Уменьшение движения отключает вращение.

В 1.25 звёздочка избранного и папка сборников — небольшие встроенные SVG. Листва, изображения игр и исходные атласы не менялись. Избранные и пользовательские тексты не становятся графическими ресурсами.

В 1.26 квадратные обложки сборников оформлены исходными встроенными SVG стеблей, листьев, стрелки назад и знака +, с CSS-рамкой и приглушённым зелёным градиентом. Изображения персонажей, фоны и атласы остальных игр не менялись; новых растровых ресурсов и внешних загрузок нет.

В 1.27 изменены только размещение элементов и показ длинных списков «Правды или действия». Все изображения, SVG обложек и цвета предыдущей версии сохранены; новые графические файлы не добавлялись.

В 1.28 переработаны редактор карточки, выбор сборников, кнопка массового избранного и компактная карточка рекордов. Используются прежние встроенные значки и CSS; растровые изображения и атласы игр не менялись.

В 1.29 кнопка массового добавления стала компактнее и использует встроенные значки папки и отмены. В общем меню добавлены сворачиваемые разделы, цель костей перенесена в их настройки. Все растровые изображения, фоны и атласы реакций сохранены без изменений.

В 1.30 меню содержит два независимых раздела; выделение карточек отмечено CSS-подсветкой и галочкой. Крестик меню убран. Используются прежние встроенные значки; все растровые файлы сохранены без изменений.

В 1.31 добавлены локальный поиск, фильтры и панели выделения карточек. Красная корзина — встроенный SVG, подсветка и остальные элементы выполнены CSS. Фоны, персонажи, атласы и файлы vendor не менялись.

В 1.31.2 уточнены подписи области удаления карточек. Красная корзина и все изображения сохранены без изменений.

В 1.31.2 исправлено сохранение положения списков при выделении и скрытии вкладок. Графика, стили, персонажи и атласы не менялись.

## Английский · 2.6

В сцене используются `assets/words-penthouse-v2.webp` (960 × 640) и `assets/words-tutor-reactions.webp` (1254 × 1254, четыре равных кадра, RGBA). Диван обновлён встроенным imagegen: спокойная тауповая обивка, аккуратная прострочка и деревянное основание с латунным акцентом. Персонаж из 2.5 по референсу IMG_8180.png сохранён. Фон статичен, реакции плавно сменяют цельный портрет в фиксированной позиции. Карточки на столике — элементы интерфейса с конечной браузерной анимацией; масок и независимой подмены частей тела нет. Старый фон и неиспользуемый атлас поз рук удалены. Атлас реакций экспортирован без потерь с сохранением альфы. Загрузка начинается при первом открытии английского. Остальные изображения сохранены. Окончательные промпты, режимы создания и назначение файлов: [WORDS-ART.md](WORDS-ART.md).

## Шашки · 2.10

Используются `assets/checkers-apartment-v2.webp` (768 × 768), `assets/checkers-walnut.webp` (512 × 256) и четыре отдельных прозрачных PNG по 768 × 512: `checkers-neutral-v2.png`, `checkers-thinking-v2.png`, `checkers-win-v2.png`, `checkers-lose-v2.png` в папке assets. Комната и цвет свитера изменены встроенным imagegen: сдержанный интерьер без ковра и кружева, тёмный вязаный свитер. Фактура для рамки и доски экспортирована из чистой столешницы нового фона.

Отдельные кадры исключают попадание рукава из соседней эмоции; все четыре изображения расположены в начале своих слоёв, без смещения общего атласа. Области экспорта сохраняют прежнюю геометрию портретов. Старые фон и общий атлас шашек 2.9 заменены; остальные иллюстрации сохранены побайтно. Точные пути, размеры, области экспорта, режимы и промпты: [CHECKERS-ART.md](CHECKERS-ART.md).


## Компактные столы · 2.13

При снятой галочке в «Настройки чата → Персонажи» комната и персонаж скрыты, а интерактивное поле сохраняет свой материал. В 2.13 небольшие фрагменты дерева и сукна заменены отдельными чёткими материалами, созданными встроенным imagegen по прежним фрагментам.

| Файл | Размер | Назначение |
|---|---|---|
| `assets/dice-compact-table-v2.webp` | 1024 × 1024, RGB | Тёплая древесина костей |
| `assets/poker-compact-felt-v2.webp` | 1024 × 1024, RGB | Зелёное сукно покера |
| `assets/words-compact-table.webp` | 85 × 16, RGB | Прежний чистый фрагмент мрамора английского: `words-penthouse-v2.webp`, [830,530,915,546] |

Два новых материала экспортированы в WebP с качеством 94; старые узкие фрагменты 2.12 заменены. Прежние сцены и портреты не изменены. Тёмная шахматная доска и деревянное поле шашек сохраняют свои стили и текстуру. Подробности и точные промпты: [COMPACT-TABLES-ART.md](COMPACT-TABLES-ART.md).

## Более ранняя загрузка · 2.16

После загрузки интерфейса локальные фоны и портреты подготавливаются в свободное время браузера: не больше двух фоновых файлов одновременно, с низким приоритетом. Выбранная игра начинает загрузку своих изображений сразу, независимо от очереди. Источники повторяющихся спрайтов объединяются по URL. Подготовка не запускает игру или анимацию, не блокирует управление и не обращается к модели. Для выключенных персонажей очередь не подготавливает фон и портрет; при режиме экономии трафика браузера фоновая очередь не запускается. Все изображения берутся из тех же файлов расширения.

Портреты шашек теперь хранятся в четырёх отдельных WebP без потерь, 768 × 512 RGBA. Каждый декодированный пиксель, включая альфу, совпадает с PNG версии 2.15. Суммарно 1 145 734 вместо 1 687 869 байт; выравнивание и эмоции сохранены. Подробнее: [CHECKERS-ART.md](CHECKERS-ART.md). В меню используются небольшие встроенные SVG с заданными цветами; отдельной загрузки значков нет.

## Плавность переходов · 2.17

Иллюстрации сохранены побайтно из 2.16. Изменена только отрисовка переходов: конечные анимации прозрачности через Web Animations API, с текущими весами при прерывании и без обязательного чтения размеров. Есть прежний CSS-вариант для браузеров без Element.animate(), поддержка уменьшения движения, отмена при паузе и освобождение слоёв после перехода. У покера убран пересчитываемый фильтр тени; нижняя маска и исходные кадры сохранены. Подготовка других изображений при открытой игре не начинает новых фоновых файлов и не вызывает дополнительный decode для уже пришедшего фонового файла. В меню и при закрытых играх она возобновляется по одному файлу. Длительности покера — прежние 320 мс; шахмат и шашек — прежние значения контроллера.

## Лесной кубик и значки · 2.19

Версия основана на присланной 2.17 с сохранением её анимаций. Новый прозрачный рисунок кубика: [assets/dnd-jade-die-v1.webp](assets/dnd-jade-die-v1.webp). В [DND-ART.md](DND-ART.md) указаны способ создания, параметры экспорта и полный промт. Значки коня и d20 в меню выполнены встроенными SVG. Фон пенька сохранён из 2.17.
