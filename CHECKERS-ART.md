# Иллюстрации шашек · 2.16

Фон и тёмный свитер обновлены встроенным imagegen. Исходная личность персонажа — IMG_8190(2).png. В игре используются локальные файлы; подключение Таверны, прокси и пользовательские ключи для иллюстраций не нужны.

| Файл | Размер | Назначение |
|---|---|---|
| [assets/checkers-apartment-v2.webp](assets/checkers-apartment-v2.webp) | 768 × 768, RGB | Сдержанный уютный интерьер: книги, простые шторы, спокойные стены и тёплая лампа; без ковра |
| [assets/checkers-walnut.webp](assets/checkers-walnut.webp) | 512 × 256, RGB | Натуральная текстура столешницы для доски и её рамки |
| [assets/checkers-neutral-v2.webp](assets/checkers-neutral-v2.webp) | 768 × 512, RGBA | Обычное выражение |
| [assets/checkers-thinking-v2.webp](assets/checkers-thinking-v2.webp) | 768 × 512, RGBA | Задумчивое выражение во время хода соперника |
| [assets/checkers-win-v2.webp](assets/checkers-win-v2.webp) | 768 × 512, RGBA | Победа соперника |
| [assets/checkers-lose-v2.webp](assets/checkers-lose-v2.webp) | 768 × 512, RGBA | Поражение соперника |

Светлый свитер заменён тёмным серо-коричневым вязаным свитером. В комнате убраны ковёр и кружевной декор, обои и мебель стали сдержаннее. Доска и рамка используют тёмные оттенки и непрерывную фактуру орехового дерева; сами клетки и шашки остаются настоящими элементами интерфейса.

## Исправление бокового фрагмента

В исходном атласе край рукава левого портрета заходил за условную границу правого. Поэтому в задумчивом выражении и поражении слева появлялся чужой кусочек. В 2.10 каждая эмоция — отдельный PNG со своей альфой. При экспорте выделены реальные области портретов, сохранены их координаты относительно прежнего окна 768 × 512; в изображение не копируются части соседних поз. Цвет полностью прозрачных пикселей нормализован без изменения видимых цветов. В интерфейсе нет сдвига общего атласа: все четыре самостоятельных изображения расположены в начале своих слоёв. Плавность и выдержка выражений сохранены. Обычный способ отображения шахматного персонажа не менялся.

Области исходного обновлённого полотна: обычное [0,0,795,512], задумчивое [795,0,1536,512], победа [0,525,795,1024], поражение [795,527,1536,1024]. Выравнивание относительно исходных ячеек 768 × 512 сохранено. Это экспорт кадров для интерфейса; лицо, руки и свитер отдельных эмоций не собираются из разных частей.

В 2.11 исправлено отдельное смещение задумчивого кадра: корпус и руки в самом исходнике находились левее обычного выражения. Для этого кадра задан постоянный горизонтальный отступ 52 / 768 ширины изображения, подобранный по вороту, рукавам и кистям. Он применяется до смены прозрачности и масштабируется вместе с портретом; положение окна, доски и остальных кадров не меняется. Файлы иллюстраций и длительности переходов сохранены.

Фон уменьшен и сохранён в WebP с качеством 90. Фактура взята из чистой столешницы нового фонового изображения: область [350,900,950,1200], экспорт 512 × 256, качество 95. Портреты сохранены в PNG без потерь. Старый фон и общий атлас 2.9 больше не входят в архив. Другие иллюстрации расширения сохранены.

## Плавность · 2.13

Изображения и поправка положения задумчивого кадра сохранены. Для шашек переход к задумчивости занимает 620 мс, возврат — 760 мс, итог — 800 мс с мягкой кривой ускорения и торможения. Задумчивость выдерживается минимум 1500 мс активного времени, возврат откладывается минимум на 480 мс после ответа соперника; сами ходы этим не задерживаются. Шахматные длительности не менялись.

Поиск шашечного хода выполняется в локальном module worker, чтобы сложный расчёт не занимал поток интерфейса. Он получает только позицию, очередь хода, счётчики ничьей, правило взятия и сложность. При паузе, новой партии или закрытии поиск отменяется; устаревшие ответы не применяются. При отсутствии поддержки остаётся прежний ограниченный локальный поиск. Постоянных движений корпуса и новых кадров нет.

## Правка персонажа

Режим: встроенный imagegen, `identity-preserve / precise-object-edit`. Цель правки — исходный атлас 2.9; после генерации портреты экспортированы отдельными файлами.

```text
Use case: identity-preserve / precise-object-edit.
Asset type: corrected transparent four-expression character atlas for an existing checkers game.
INPUT IMAGE 1 is the EDIT TARGET: the existing 2x2 character expression atlas. Preserve this SAME adult man, his exact recognizable facial identity, dark wavy swept-back hair, dark short full beard and moustache, hazel eyes, natural warm fair skin, existing four subtle expressions, cozy seated posture and illustration style. Do not replace the man or redesign his face.
Required changes: change the light beige sweater to a deep muted charcoal / dark olive-brown knitted crew-neck sweater, soft comfortable fit, restrained realistic knit and ribbed cuffs. Darker and more understated, flattering with his dark hair; enough warm highlights to read the knit, not featureless black. Keep the same natural hands, body proportions and warm left-side lamp light with gentle cool right-side evening fill.
CRITICAL ARTIFACT FIX: the input incorrectly lets the right elbow of each LEFT-column man cross into the next RIGHT-column cell, producing a stray sleeve fragment beside the focused/loss portraits. Remove all such fragments. EACH person must be wholly contained in his own cell. Center the man consistently within each cell, with at least 32 pixels of COMPLETELY EMPTY TRANSPARENT SPACE along BOTH left and right cell edges, at least 10 pixels above his hair and a thin clear space below the wrists. Nothing at all from another cell may appear in those empty margins. No arms, sleeves, shadows, glow, color wash or partial person may cross any cell boundary.
Output strict 2 columns x 2 rows, four equal LANDSCAPE 3:2 cells, total canvas 3:2, preferably 1536x1024. Every cell has the same body pose, exact head/body scale and alignment; only facial expression and gaze change. Show the whole waist-up seated portrait and resting forearms. Top-left: existing calm neutral. Top-right: existing thoughtful gaze toward the board. Bottom-left: small warm satisfied smile after his own victory. Bottom-right: subtle rueful expression after losing. No exaggerated gestures or moving hands.
GENUINE TRANSPARENT ALPHA outside each man, clean cutout edges, NO background, NO blurred aura, NO glows, NO colored blocks, NO table, chair, scenery, divider lines, text, watermark or decorative frame. Preserve the same mature painterly visual-novel illustration and natural anatomy. Fix edge containment in all four cells as carefully as the sweater recolor.
```

## Правка комнаты

Режим: встроенный imagegen, `precise-object-edit`. Цель правки — исходный фон 2.9.

```text
Use case: precise-object-edit.
Asset type: revised background for an existing cozy Russian apartment checkers game.
INPUT IMAGE 1 is the EDIT TARGET, the previous room. Preserve the SQUARE framing, the player's eye-level view across the wooden table, the empty chair centered for a separately composited man, window on the right with cool blue evening light, warm lamp light from the left, and the general feeling of a comfortable real Russian apartment. Keep the table edge and chair in compatible positions so the character will still sit naturally.
Change the interior to a more understated, masculine, lived-in apartment with some old furniture that has been cared for. Remove the patterned wall carpet COMPLETELY and remove the patterned rug/throw over the armchair. No wall rugs, floor rugs or patterned carpets anywhere. Replace floral wallpaper with calm slightly textured warm taupe / muted olive plaster walls. Replace ornate lace curtains with simple plain soft gray-brown linen curtains, drawn open at the window. Remove lace doilies and decorative porcelain china displays; simplify the old wooden wall cabinet into a restrained dark walnut bookcase / sideboard with a few books and simple neutral ceramics. Keep it modest and cozy, not a penthouse or luxury office. An unobtrusive framed landscape or small print on the now-clear wall is fine, no ornate gold frame. Use a simple warm-shaded table lamp, one or two small plants, a plain upholstered chair in muted dark gray or olive in the background. No clutter or extra characters.
Make the wooden tabletop and furniture a little darker, richer WALNUT, with visible realistic wood grain and soft warm reflections. The clean tabletop should remain empty, across the lower foreground beginning around 58 percent height, so the real interactive checkers board can be placed over it. Keep the center above the table calm for the separate character layer. Crisp painterly western visual-novel illustration consistent with the original, warm amber / soft cool evening lighting. No pixel art, no anime. No people, hands, game board, pieces, words, readable book titles, logos, watermark, UI or border.
```


## Быстрый возврат эмоции · 2.15

По просьбе пользователя прежняя долгая выдержка 2.13 сокращена: переход к задумчивости — 300 мс, возврат — 360 мс, итог — 520 мс. Минимальная выдержка — 650 мс активного времени, задержка возврата после хода — 80 мс. Сохранены мягкая кривая перехода, неподвижное выравнивание кадров, пауза и приоритет победы/поражения. Сам поиск и изображения не менялись. Шахматные длительности не затронуты.

## Подготовка изображений · 2.16

Четыре отдельных кадра переведены в WebP без потерь и без изменения размера или альфы. При экспорте проверено полное совпадение RGBA каждого пикселя с PNG версии 2.15. Суммарный объём четырёх портретов уменьшился с 1 687 869 до 1 145 734 байт. Постоянный отступ задумчивого кадра и все длительности сохранены. Изображения готовятся заранее небольшой очередью; открытие партии не ожидает завершения этой очереди.
