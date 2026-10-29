# Домино: два набора, домашняя сцена и эмоции · 2.32

Деревянная доска и тёмный набор из 2.30 сохранены. В 2.31 добавлен выбор «Тёмный / Зелёный» в меню игр → «Настройки чата» → «Костяшки домино». Зелёная лицевая сторона возвращена без изменения из 2.28–2.29, а рубашка переделана: вместо месяца и папоротника — такой же золотой ромб, как у тёмных костяшек.

Над полем добавлена домашняя сцена по IMG_1802: молодой мужчина со взъерошенными чёрными волосами в мягком светлом свитере, тёплый свет лампы и книжные полки. Он сидит за столом, опираясь ладонью на щёку. В 2.32 добавлены отдельные выражения лица: задумчивость на ходе соперника, радость после его победы и огорчение после победы игрока. На ходе игрока и при ничьей используется исходная сцена. Фон, волосы, силуэт головы, руки и свитер остаются из исходного изображения; из новых вариантов видна только мягко ограниченная область лица. В «Настройки чата → Персонажи → Домино» можно убрать галочку: сцена скрывается, деревянная доска и костяшки остаются, окно становится компактнее.

## Рабочие ресурсы

| Файл расширения | Размер | Объём | Назначение |
| --- | --- | --- | --- |
| `assets/domino-luxury-walnut-v1.webp` | 1086 × 1448, RGB | 418 316 байт | Спокойная фактура тёмного ореха для доски |
| `assets/domino-luxury-front-v1.webp` | 887 × 1774, RGBA | 231 682 байта | Деревянная лицевая сторона с золотым разделителем, без точек |
| `assets/domino-luxury-back-v1.webp` | 887 × 1774, RGBA | 167 812 байт | Рубашка с небольшим золотым ромбом |
| `assets/domino-green-front-v1.webp` | 887 × 1774, RGBA | 209 572 байта | Прежняя зелёная лицевая сторона из 2.28–2.29 |
| `assets/domino-green-back-v1.webp` | 887 × 1774, RGBA | 225 874 байта | Зелёная рубашка с золотым ромбом |
| `assets/domino-home-scene-v1.webp` | 1774 × 887, RGB | 240 876 байт | Неизменная исходная сцена и обычное выражение |
| `assets/domino-emotion-thinking-v1.webp` | 1774 × 887, RGB | 218 010 байт | Задумчивое выражение |
| `assets/domino-emotion-win-v1.webp` | 1774 × 887, RGB | 204 140 байт | Радость соперника после его победы |
| `assets/domino-emotion-lose-v1.webp` | 1774 × 887, RGB | 225 326 байт | Огорчение соперника после его поражения |

Общий объём девяти ресурсов — 2 141 608 байт. Тёмный комплект занимает 817 810 байт, три новых выражения — 647 476 байт. Лицевая сторона выбранного набора повторно используется для всех значений, рубашка — для руки соперника.

Три изображения тёмного комплекта созданы встроенным ImageGen в 2.30. В 2.31 тем же встроенным инструментом созданы новая зелёная рубашка и домашняя сцена; зелёная лицевая сторона скопирована побайтово из прежней версии. CLI и отдельный API для графики не использовались. Новые PNG перекодированы в WebP с quality 94, method 6, без изменения разрешения. Alpha зелёной рубашки сохранена точно; изображения после генерации не ретушировались. В 2.32 встроенным ImageGen созданы три варианта лица по исходной домашней сцене; итоговые PNG также перекодированы в WebP с quality 94, method 6, без кадрирования, ретуши или изменения разрешения. Оригинальная сцена и все прежние ресурсы сохранены побайтово.

Исходные PNG:
- `generated_images/exec-8702aa06-25b4-488b-b1b2-09c170565da9.png` — орех.
- `generated_images/exec-6cd75b99-c424-4805-a818-5116d2576272.png` — лицевая сторона.
- `generated_images/exec-3ba70f47-be2a-4d8b-8ca1-2d42636c542e.png` — рубашка.
- `generated_images/exec-68f87c92-3a7b-43b8-9728-c6caec35d354.png` — зелёная рубашка с ромбом.
- `generated_images/exec-2539da14-99a7-4180-a62f-b5b17be7e36b.png` — домашняя сцена.
- `generated_images/exec-07a6b3d9-01d8-4c2f-9e61-bfc99cb96c69.png` — задумчивость.
- `generated_images/exec-192650d8-5f09-400a-b6a6-dca1a9b88bc4.png` — окончательная радость.
- `generated_images/exec-c7f0382d-f254-4728-a931-591c424061fa.png` — огорчение.

Референс тёмной лицевой стороны — прежняя костяшка `domino-calm-front-v1.webp` из 2.29: сохранена её форма и компоновка, изменены материал и отделка. Референс тёмной рубашки — тёмная лицевая сторона. Фактура ореха сгенерирована без референса. Зелёная рубашка использует тёмную рубашку как образец формы и ромба, зелёную лицевую сторону — как образец цвета и материала. IMG_1802 использован только для внешности персонажа; одежда, поза и домашняя обстановка созданы для игры. Для персонажа применены рекомендации навыка «Мягкая стилизация персонажей».

## Отображение и читаемость

Орех рисуется один раз на поверхности стола через `--domino-scene-art`; `background-size:cover` сохраняет пропорции. Тонкую рамку, латунный кант и затемнения верхней и нижней зон рисует CSS. Геометрия поля, отступы, размер костяшек и высота кнопок сохранены.

Прозрачные поля костяшек исключаются только при отображении CSS. Исходные ресурсы не обрезаны. Области alpha > 32: лицевая сторона [112,155,775,1620], рубашка [112,154,776,1619]. Горизонтальные костяшки поворачивают рисунок, дубли и рука используют вертикальную ориентацию.

Для зелёного набора области alpha > 32: лицевая сторона [113,159,775,1619], рубашка [112,154,777,1620]. Смена набора меняет только ссылки на две текстуры и их кадрирование CSS; элементы поля, выделение, очередь хода и журнал не создаются заново. По умолчанию используется «Тёмный». Выбор набора и показ персонажа сохраняются в штатных настройках расширения независимо от оформления d20 и других игр.

Домашняя сцена занимает отдельную компактную область с пропорциями 2:1. На невысоких экранах она уменьшается целиком, без обрезки лица. Скрытие сцены не уменьшает игровое поле и не сбрасывает партию.

Выражения накладываются поверх исходной сцены через одну мягкую SVG-маску лица, одинаковую для всех слоёв. Маска задана кодом в `domino-portrait.js`; она не меняет файлы изображений. Переход использует только прозрачность: 480 мс к задумчивости, 620 мс обратно к обычному выражению и 680 мс к результату. Задумчивость удерживается минимум 950 мс активного времени; возврат к обычному лицу имеет задержку не менее 200 мс. Это сглаживает короткие ходы соперника, не задерживая сам игровой ход и не блокируя кнопки игрока.

При паузе, закрытии окна или отключении персонажа конечная анимация завершается, таймер удержания останавливается. Продолжение игры сохраняет оставшееся время. Перезапуск очищает старое отложенное выражение; результат партии заменяет его сразу. Новая картинка применяется только после загрузки; поздняя загрузка старого состояния не заменяет актуальное. Если ресурс недоступен, видна целая исходная сцена. При системном уменьшении анимации переход выполняется без движения; если браузер не поддерживает маски, остаётся исходная сцена.

Проверка в Chromium на четырёх размерах окна подтвердила неизменность области персонажа и переходы только по прозрачности. Сравнение кадров на телефонном размере обнаружило ноль изменённых пикселей за пределами области лица. Проверены настоящие ходы локального соперника, оба исхода и ничья, пауза, скрытие, перезапуск, оба скина, самостоятельное демо и открытие остальных восьми игр. Это проверки в тестовой оболочке; работа с реальным подключением SillyTavern и Safari не проверялась.

Точки 0–6 рисуются кодом по настоящему значению костяшки. Их размер сохранён из 2.29, цвет — светлое золото с тёмным ободком. На изображении лицевой стороны собственных точек нет. Выделение отмечается золотистой подсветкой. Настройки, журнал, правила, кнопки концов и новой партии получили тёплые коричневые и латунные цвета.

Ресурсы загружаются локально из папки расширения, а в `demo.html` встроены. В JavaScript добавлены настройка скина, её восстановление при ошибке сохранения, независимое скрытие персонажа и локальное управление выражениями лица. Игровые правила, состав записей журнала, подключение к чату, кубики ДНД и анимации других игр не изменены. Удалённая ранее строка о партии на паузе остаётся убранной.

## Точные промпты ImageGen

### Ореховая доска

```text
Use case: stylized-concept
Asset type: production material texture for a luxury domino playing board, portrait 3:4, opaque full bleed.
Primary request: A beautiful continuous surface of expensive dark smoked walnut, seen perfectly straight from above. The entire image is the actual flat polished hardwood surface where dominoes will be laid. Refined cabinetmaker quality: rich chocolate-brown heartwood, restrained fine flowing grain, subtle quarter-sawn variations, small warm amber veins, a satin hand-rubbed finish with a soft broad sheen. Warm dark brown midtones must remain visible; do not make the wood almost black. The game pieces will be ebony with gold pips, so keep this surface somewhat lighter than black ebony.
Style: premium hand-illustrated material art with convincing wood depth, very clean fine grain and softly painterly shading. Crisp and elegant, mature, quiet. Luxury through material quality, not clutter. Even ambient warm light, no spotlight or strong glare.
Composition: EDGE-TO-EDGE WOOD TEXTURE ONLY, uniform scale, no perspective, no visible room, no objects or pieces. Keep the grain calm through the large central area so 28 small dominoes stay easy to read. The game code adds the exact board border, brass trim and live controls; DO NOT draw a frame or border into the image.
Avoid: green felt, foliage, leaves, forest, bark, moss, rustic planks, rough scratches, obvious repeated boards or seams, large knots, busy burl patterns, ornaments, brass strips, symbols, pips, dots, text, labels, numbers, UI, domino pieces, people, furniture edges, huge specular reflections, watermark.
```

### Лицевая сторона

```text
Use case: precise-object-edit
Asset type: ONE production front sprite for a luxury ebony-and-brass domino set, TRUE transparent background.
Input image: the supplied existing green domino is the EDIT TARGET for the exact silhouette, orthographic top view, rounded corners, border thickness, central divider, canvas framing and scale ONLY. Replace the green botanical material and leaf ornament.
Primary request: Transform the piece into expensive polished EBONY / near-black smoked hardwood, with a thin champagne-gold brass rim and ONE slender horizontal brass inlay exactly at the midpoint. Restrained subtle deep brown wood grain, satin hand-rubbed sheen, small clean bevel, finely crafted solid domino. The dark warm black/brown body should read as actual luxurious hardwood rather than green resin or a playing card. Fine refined illustration with convincing material, not childish and not noisy.
Both inner half faces must be completely PLAIN and very dark for precise golden game pips to be drawn by code. Remove ALL leaves, vines, flowers, dots and decorative center marks from both halves. A tiny fine champagne-gold edge detail is enough. No ornamental marks at all in the inner 80% of either half.
Preserve exactly ONE upright rectangular domino, width:height 1:2, straight parallel sides, small rounded corners, perfect top view with no tilt/perspective. Match the supplied canvas framing and full silhouette closely; leave narrow actual transparent margins.
CRITICAL: NO PIPS, NO dots, NO holes, NO numbers, NO letters, NO text, NO crest or symbol on the front, NO plants or green color, NO texture flecks that look like dots, NO scene, NO shadow beyond the object silhouette, NO checkerboard, watermark or other object. Preserve TRUE ALPHA outside the tile.
```

### Рубашка

```text
Use case: precise-object-edit
Asset type: ONE matching reverse-side sprite for a luxury ebony-and-brass domino set, TRUE transparent background.
Input image: the newly generated ebony domino FRONT is the EDIT TARGET and exact reference for silhouette, dimensions, framing, dark polished wood grain, slim gold rim and bevel.
Primary request: Produce the matching BACK. Preserve the entire rectangular object and transparent surroundings exactly. Remove the horizontal center divider. The back is one continuous near-black warm ebony wood surface, satin polished, same subtle grain and narrow champagne-gold rim as the front.
At the exact center add just ONE small refined gold-inlaid geometric crest: a slender vertical diamond formed by two delicate nested outlines, with a tiny simple four-point line ornament inside. Elegant cabinetmaker / Art Deco detail, about one third of the tile width, understated and recognizable at small size. No elaborate floral scrolls, crown, lettering or dot patterns. Nothing else on the surface.
Composition: exactly ONE upright domino, orthographic top view, width:height 1:2, straight sides, small rounded corners, identical framing and scale to the front. TRUE alpha outside silhouette; no tilt, perspective, other tile or scene.
Constraints: no midpoint divider, no pips, no numbers, no text/monogram letters, no plants/green/moon, no background, no cast shadow outside tile, no checkerboard, no watermark. Refined illustrated wood material, not a cartoon card.
```


### Зелёная рубашка · 2.31

```text
Use case: precise-object-edit
Asset type: ONE reverse-side sprite for the green domino skin, TRUE transparent background.
Input images: Image 1 (dark wooden domino back) is the EDIT TARGET for its EXACT silhouette, framing, slim gold border and central gold DIAMOND crest. Image 2 (green domino face) supplies ONLY the desired deep forest-green painted material and gold/sage palette.
Primary request: Recolor/redesign image 1 as the matching BACK for image 2. Keep the same upright rounded rectangular domino, small bevel, thin gold rim, and the same centered narrow double-diamond and four-point line emblem as the dark back. Replace the black-brown ebony with the calm deep bottle-green surface of image 2, softly painted, with very restrained grain. The central gold diamond must be clear; there must be NO moon or fern illustration. Keep surrounding green quiet and elegant.
Preserve exact 1:2 object proportions, top-down view, canvas framing, straight sides, small corners, true transparency outside the silhouette. No transverse divider.
Constraints: exactly one tile, no pips, no numbers, no text, no flowers/leaves/moon, no scene, no tilt or perspective, no cast shadow outside silhouette, no checkerboard, no watermark.
```

### Домашняя сцена · 2.31

```text
Use case: identity-preserve
Asset type: production wide landscape illustration for the opponent scene above a compact domino game.
Input image: IMG_1802 is the CHARACTER IDENTITY reference only. Preserve this young adult man's recognizable face, warm natural tan skin, brown eyes, thick tousled jet-black hair, soft eyebrows, slim build, small subtle ear studs and friendly expression. The blue background and white tee are not retained.
Primary request: He sits opposite the viewer at a dark walnut table in a warm, cozy modern home, ready for a quiet game together. Dress him in a soft oatmeal/ivory knitted crew-neck sweater with natural relaxed sleeves and few broad folds. Friendly calm small smile, relaxed shoulders, direct warm gaze. He is clearly an adult in his early twenties, naturally proportioned, not bulky or childlike.
Scene: comfortable softly lit living room, warm wood bookcase with a few books, muted olive upholstered chair or sofa, simple curtain, one warm-shaded domestic lamp. Cozy and lived-in, tidy and restrained. He is seated at the center with forearms naturally resting on the table's very bottom edge, hands relaxed and anatomically clear. The dark walnut table is only a thin horizontal strip at the bottom; the actual interactive domino field will sit below the illustration.
Style/medium: soft hand-painted character illustration with clean pencil-like contours, natural hair clumps and gentle brush shadows. Preserve individuality, mature face and normal-sized eyes. No generic anime face, no chibi, no pixel art, no photorealistic skin, no exaggerated body proportions, no busy micro-detail or scratchy noise. Background in the SAME soft illustrated style, soft warm light, palette oatmeal, honey, muted olive and walnut.
Composition: WIDE LANDSCAPE 2:1 canvas, full bleed. A compact horizontal portrait scene: entire head and hair visible with safe space above, upper torso and forearms, character centered and occupying roughly the middle 46–52% of the width, face clearly visible. The room fills the sides. Eye-level across the tabletop, gentle natural perspective. Keep all important anatomy inside the middle 85% of the height so a small UI preview stays legible. One coherent still illustration, no panels or sprite sheet.
Constraints: NO dominoes or game pieces/cards, NO UI, NO letters, NO numbers, NO logos/watermarks, no extra person, no animals/animal ears/tail, no giant hands, no extra fingers, no cropped-off hair. Opaque background.
```


### Задумчивость

```text
Use case: precise-object-edit
Asset type: facial-expression variant of the supplied domino opponent scene.
The supplied image is the EXACT EDIT TARGET. Preserve its size 1774×887, camera, composition and every object and pose. The SAME young adult man with black tousled hair, brown eyes, tan skin and oatmeal knit sweater props his head on his left palm at the walnut table.
CHANGE ONLY THE FACIAL EXPRESSION: the eyebrows, eyelids, eyes and mouth within the existing face. DO NOT move or resize the head, eyes' centers, nose, ears, jaw outline, hair silhouette, hand touching his cheek, arms, sweater, table, background or lighting. Do not tilt or turn the head. Keep the same face identity and warm skin colors. His facial landmarks must remain at the exact same coordinates so this variant can crossfade over the original without motion.
Maintain the exact original illustration style and detail. No new accessories, objects, markings, tears, text, game pieces or border. No change to anatomy or age. Opaque full landscape image, not a sprite sheet and not a close-up.
Expression requested: Quiet concentration while deciding a domino move. Mouth gently closed with a natural relaxed neutral line, the smile disappears. Brows subtly drawn together, eyes attentively directed slightly downward at the table using only the eyelids/irises. Thoughtful and friendly, not angry. Preserve every other pixel and the resting pose.
```

### Радость — окончательный вариант

```text
Use case: precise-object-edit
Asset type: joyful victory facial expression for the supplied game-opponent illustration.
This supplied image is the EXACT edit target. It currently looks too much like the ordinary friendly expression. Make the man's victory emotion DISTINCTLY HAPPIER, changing ONLY his eyebrows, eyelids and mouth within the existing face.
Give him joyfully softly CLOSED / nearly closed crescent eyes, gently lifted cheeks and a naturally broader pleased smile with upper teeth visible. Warm relaxed delight after winning, no exaggerated laughter or huge open mouth. Keep his identity, adult proportions, nose and eye centers, skin colors, jaw outline, head tilt, hair, hand against his cheek, arms, knit sweater, pose, room, table, light and EVERY element outside the face unchanged at identical coordinates. No movement of his body or camera, no cropping or resizing. Same 1774×887 landscape canvas, same exact painted illustration style. No text, no additions, no panels.
```

### Огорчение

```text
Use case: precise-object-edit
Asset type: facial-expression variant of the supplied domino opponent scene.
The supplied image is the EXACT EDIT TARGET. Preserve its size 1774×887, camera, composition and every object and pose. The SAME young adult man with black tousled hair, brown eyes, tan skin and oatmeal knit sweater props his head on his left palm at the walnut table.
CHANGE ONLY THE FACIAL EXPRESSION: the eyebrows, eyelids, eyes and mouth within the existing face. DO NOT move or resize the head, eyes' centers, nose, ears, jaw outline, hair silhouette, hand touching his cheek, arms, sweater, table, background or lighting. Do not tilt or turn the head. Keep the same face identity and warm skin colors. His facial landmarks must remain at the exact same coordinates so this variant can crossfade over the original without motion.
Maintain the exact original illustration style and detail. No new accessories, objects, markings, tears, text, game pieces or border. No change to anatomy or age. Opaque full landscape image, not a sprite sheet and not a close-up.
Expression requested: Mild disappointment after losing the game. Mouth gently closed, its corners slightly lowered, inner eyebrows subtly raised and eyes a little softer and downcast. Friendly, human disappointment without anger or exaggerated sadness, no tears. Preserve facial landmark positions, jaw shape, resting hand and the rest of the scene exactly.
```
