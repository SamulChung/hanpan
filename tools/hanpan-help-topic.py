"""Writes the in-app help topic "hanpan" (한판 시작하기) in the 21 UI languages.

usage: python tools/hanpan-help-topic.py
Every language has the same structure (one title, six sections, the same lists),
which tools/check-help-langs.mjs compares against the English file.
"""
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / 'apps/shell/src/renderer/src/i18n/help/topics'

# (title, intro, [ (heading, kind, [items]) ... ])  kind: 'ol' | 'ul'
T = {}

T['ko'] = ('한판 시작하기', '한판은 마인드맵으로 정리한 생각을 한글 보고서·PPT·워드로 보내 같은 창에서 이어 쓰고, 마인드맵과 문서를 서로 맞춥니다. AI는 이 PC에 깔린 AI를 먼저 씁니다.', [
 ('마인드맵을 문서로 보내기', 'ol', [
  '마인드맵 도구 줄의 **보내기** 단추를 누르고 한글 보고서, PPT, 워드 보고서 가운데 하나를 고릅니다. PPT는 **슬라이드 스타일**에서 스티브 잡스·맥킨지·토스 등 10가지 디자인 가운데 하나를 고를 수 있습니다.',
  '양식(개조식 보고서, 장 보고서, 공문 번호)과 날짜·부서를 정하고, 내용은 **마인드맵에 적은 말 그대로** 또는 **AI가 문장으로 살 붙이기**를 고릅니다.',
  '**보내기**를 누르면 같은 창의 새 탭에 문서가 열립니다. 처음 저장할 때 저장할 곳을 묻습니다.']),
 ('마인드맵과 문서 맞추기', 'ul', [
  '**보내기 › 연결된 문서와 맞추기**를 누르면 마인드맵과 한글 문서에서 바뀐 곳이 나옵니다.',
  '마인드맵에서 고친 것은 문서로, 문서에서 고친 것은 마인드맵으로 갑니다. 양쪽에서 다르게 고친 곳은 마인드맵 쪽, 문서 쪽, 나중에 가운데 고릅니다.',
  '문서에서 쓴 본문 문장은 그대로 지켜집니다. 워드·PPT 문서는 지금은 보내기만 됩니다.']),
 ('한판 양식', 'ul', [
  '홈 화면의 **한판 양식** 카드에서 공문, 보고서, 제안서, 회의록, 기획서 양식 19가지를 한글이나 워드로 엽니다.']),
 ('한판 도구', 'ul', [
  '한글 탭 위쪽 띠의 **한판 도구**에 공문 정돈, 공문 점검, 세대별 톤 바꾸기, 3색 검토 표시, 역관목조분 프롬프트가 있습니다.',
  '문서를 고치는 도구는 결과를 탭에 바로 보여 줍니다. 저장하지 않고 닫으면 원래대로 남습니다.']),
 ('디자인', 'ul', [
  '홈 화면의 **디자인** 카드로 포스터, 카드뉴스, 안내문, 썸네일을 만듭니다.',
  '**문서에 붙여 넣기용 복사**를 누른 뒤 한글·워드·PPT 탭에서 Ctrl+V 하면 그림으로 들어갑니다. PNG와 PDF로도 저장합니다.',
  '마인드맵의 **보내기 › 카드뉴스로 보내기**는 큰 가지마다 카드 한 장을 만듭니다.']),
 ('내 PC AI', 'ul', [
  '처음 시작할 때 Ollama, LM Studio, vLLM 같은 이 PC의 AI를 찾아, AI를 따로 고르지 않았다면 그것을 기본으로 씁니다.',
  '다른 AI로 바꾸려면 **설정 › AI**에서 고릅니다.']),
])

T['en'] = ('Getting started with Hanpan', 'Hanpan sends what you sorted out in a mind map to a Hangul (HWP) report, a slide deck or a Word report in the same window, and keeps the map and the document in step. The AI on this PC comes first.', [
 ('Send a mind map to a document', 'ol', [
  'In the mind map toolbar, press **Send to a document** and pick a HWP report, PowerPoint or a Word report. For PowerPoint, **Slide style** offers ten designs, from Steve Jobs and McKinsey to a startup pitch deck.',
  'Choose the layout (point-form report, report with chapters, official letter numbering), the date and department, and whether to send **exactly what the map says** or **let the AI write the sentences**.',
  'Press **Send**: the document opens in a new tab of the same window. Its first save asks where to keep it.']),
 ('Sync the map and the document', 'ul', [
  'Press **Send to a document › Sync with linked documents** to see what changed in the map and in the HWP document.',
  'Changes made in the map go to the document, and changes made in the document come to the map. Where both sides changed a topic differently, choose the map\'s, the document\'s, or later.',
  'Sentences written in the document are kept. Word and PowerPoint documents can be sent but not synced back yet.']),
 ('Hanpan templates', 'ul', [
  'The **Hanpan templates** card on Home opens 19 templates (official letters, reports, proposals, minutes, plans) as HWP or Word.']),
 ('Hanpan tools', 'ul', [
  '**Hanpan tools** in the strip above a HWP tab tidy and check an official letter, change its tone for a generation, mark a three-colour review and build a structured prompt.',
  'Tools that change the document show the result in the tab right away. Closing without saving leaves the file as it was.']),
 ('Design', 'ul', [
  'The **Design** card on Home makes posters, card news, notices and thumbnails.',
  'Press **Copy to paste in a document**, then Ctrl+V in a HWP, Word or PowerPoint tab to put the page in as a picture. Pages also save as PNG and PDF.',
  '**Send to a document › Send to card news** in a mind map makes one card per main branch.']),
 ('The AI on this PC', 'ul', [
  'At first start Hanpan looks for an AI running on this PC (Ollama, LM Studio, vLLM) and, if you have not chosen an AI, uses it.',
  'To use another AI, choose it in **Settings › AI**.']),
])

T['zh'] = ('Hanpan 入门', 'Hanpan 可以把思维导图整理的内容发送为 Hangul (HWP) 报告、演示文稿或 Word 报告，在同一窗口继续编辑，并让导图与文档保持一致。AI 优先使用本机上的 AI。', [
 ('把思维导图发送到文档', 'ol', [
  '在思维导图工具栏点 **发送到文档**，选择 HWP 报告、PowerPoint 或 Word 报告。',
  '选择版式（要点式报告、分章报告、公文编号）、日期和部门，再选 **按导图原文** 或 **由 AI 扩写成句子**。',
  '点 **发送**，文档会在同一窗口的新标签页中打开。首次保存时会询问保存位置。']),
 ('同步导图与文档', 'ul', [
  '点 **发送到文档 › 与关联文档同步**，可查看导图和 HWP 文档中的变化。',
  '导图中的修改会进入文档，文档中的修改会回到导图。两边改得不同的地方，可选择以导图为准、以文档为准或稍后。',
  '在文档中写的正文会被保留。Word 和 PowerPoint 文档目前只能发送，不能回同步。']),
 ('Hanpan 模板', 'ul', [
  '主页的 **Hanpan 模板** 卡片可用 HWP 或 Word 打开 19 种模板（公文、报告、提案、会议纪要、计划书）。']),
 ('Hanpan 工具', 'ul', [
  'HWP 标签页上方的 **Hanpan 工具** 可整理和检查公文、按年龄层转换语气、标记三色审阅并生成结构化提示词。',
  '修改文档的工具会立即在标签页中显示结果。不保存就关闭，文件保持原样。']),
 ('设计', 'ul', [
  '主页的 **设计** 卡片可制作海报、卡片新闻、通知和缩略图。',
  '点 **复制以粘贴到文档**，然后在 HWP、Word 或 PowerPoint 标签页按 Ctrl+V，即可作为图片插入。也可保存为 PNG 和 PDF。',
  '在思维导图中点 **发送到文档 › 发送为卡片新闻**，每个主分支生成一张卡片。']),
 ('本机 AI', 'ul', [
  '首次启动时，Hanpan 会查找本机运行的 AI（Ollama、LM Studio、vLLM），如果你还没有选择 AI，就使用它。',
  '要换用其他 AI，请在 **设置 › AI** 中选择。']),
])

T['zh-TW'] = ('Hanpan 入門', 'Hanpan 可以把心智圖整理的內容傳送為 Hangul (HWP) 報告、簡報或 Word 報告，在同一視窗繼續編輯，並讓導圖與文件保持一致。AI 優先使用本機上的 AI。', [
 ('把心智圖傳送到文件', 'ol', [
  '在心智圖工具列點 **傳送到文件**，選擇 HWP 報告、PowerPoint 或 Word 報告。',
  '選擇版式（條列式報告、分章報告、公文編號）、日期和部門，再選 **依導圖原文** 或 **由 AI 擴寫成句子**。',
  '點 **傳送**，文件會在同一視窗的新分頁中開啟。第一次儲存時會詢問儲存位置。']),
 ('同步導圖與文件', 'ul', [
  '點 **傳送到文件 › 與連結文件同步**，可查看導圖和 HWP 文件中的變更。',
  '導圖中的修改會進入文件，文件中的修改會回到導圖。兩邊改得不同的地方，可選擇以導圖為準、以文件為準或稍後。',
  '在文件中寫的內文會被保留。Word 和 PowerPoint 文件目前只能傳送，不能回同步。']),
 ('Hanpan 範本', 'ul', [
  '首頁的 **Hanpan 範本** 卡片可用 HWP 或 Word 開啟 19 種範本（公文、報告、提案、會議紀錄、企劃書）。']),
 ('Hanpan 工具', 'ul', [
  'HWP 分頁上方的 **Hanpan 工具** 可整理和檢查公文、依年齡層轉換語氣、標記三色審閱並產生結構化提示詞。',
  '修改文件的工具會立即在分頁中顯示結果。不儲存就關閉，檔案保持原樣。']),
 ('設計', 'ul', [
  '首頁的 **設計** 卡片可製作海報、卡片新聞、通知和縮圖。',
  '點 **複製以貼到文件**，然後在 HWP、Word 或 PowerPoint 分頁按 Ctrl+V，即可作為圖片插入。也可儲存為 PNG 和 PDF。',
  '在心智圖中點 **傳送到文件 › 傳送為卡片新聞**，每個主分支產生一張卡片。']),
 ('本機 AI', 'ul', [
  '第一次啟動時，Hanpan 會尋找本機執行的 AI（Ollama、LM Studio、vLLM），如果你還沒有選擇 AI，就使用它。',
  '要改用其他 AI，請在 **設定 › AI** 中選擇。']),
])

T['ja'] = ('Hanpan をはじめる', 'Hanpan はマインドマップで整理した考えをハングル (HWP) 報告書・スライド・Word 報告書へ送り、同じウィンドウで書き続け、マップと文書を互いに合わせます。AI はこの PC の AI を優先して使います。', [
 ('マインドマップを文書へ送る', 'ol', [
  'マインドマップのツールバーで **文書へ送る** を押し、HWP 報告書・PowerPoint・Word 報告書から選びます。',
  '様式（箇条書き報告書、章立て報告書、公文書の番号）と日付・部署を決め、**マップの言葉そのまま** か **AI に文章を書かせる** を選びます。',
  '**送る** を押すと、同じウィンドウの新しいタブで文書が開きます。最初の保存で保存先を尋ねます。']),
 ('マップと文書を合わせる', 'ul', [
  '**文書へ送る › つながった文書と同期** を押すと、マップと HWP 文書で変わった箇所が表示されます。',
  'マップで直した内容は文書へ、文書で直した内容はマップへ反映されます。両方で違うように直した箇所は、マップの方・文書の方・後で から選びます。',
  '文書で書いた本文はそのまま残ります。Word・PowerPoint 文書は今のところ送ることだけができます。']),
 ('Hanpan テンプレート', 'ul', [
  'ホームの **Hanpan テンプレート** カードから、公文書・報告書・提案書・議事録・企画書の 19 種類のテンプレートを HWP か Word で開けます。']),
 ('Hanpan ツール', 'ul', [
  'HWP タブ上部の **Hanpan ツール** には、公文書の整理とチェック、世代別の口調変更、3色レビュー、プロンプトビルダーがあります。',
  '文書を直すツールは結果をすぐタブに表示します。保存せずに閉じればファイルは元のままです。']),
 ('デザイン', 'ul', [
  'ホームの **デザイン** カードでポスター、カードニュース、お知らせ、サムネイルを作ります。',
  '**文書に貼り付け用にコピー** を押してから HWP・Word・PowerPoint タブで Ctrl+V すると画像として入ります。PNG と PDF でも保存できます。',
  'マインドマップの **文書へ送る › カードニュースへ送る** は、大きな枝ごとにカードを一枚作ります。']),
 ('この PC の AI', 'ul', [
  '初回起動時に Ollama・LM Studio・vLLM などこの PC の AI を探し、AI をまだ選んでいなければそれを使います。',
  ' 別の AI にするには **設定 › AI** で選びます。'.strip()]),
])

def latin(lang, title, intro, h, b):
    return (title, intro, [
        (h[0], 'ol', b[0]), (h[1], 'ul', b[1]), (h[2], 'ul', b[2]), (h[3], 'ul', b[3]), (h[4], 'ul', b[4]), (h[5], 'ul', b[5])])

T['fr'] = latin('fr', 'Bien démarrer avec Hanpan', "Hanpan envoie ce que vous avez organisé dans une carte mentale vers un rapport Hangul (HWP), une présentation ou un rapport Word dans la même fenêtre, et garde la carte et le document en accord. L'IA de ce PC passe en premier.",
 ['Envoyer une carte mentale vers un document', 'Synchroniser la carte et le document', 'Modèles Hanpan', 'Outils Hanpan', 'Design', "L'IA de ce PC"],
 [["Dans la barre d'outils de la carte, appuyez sur **Envoyer vers un document** et choisissez un rapport HWP, PowerPoint ou un rapport Word.",
   "Choisissez la mise en page (rapport à puces, rapport en chapitres, numérotation de lettre officielle), la date et le service, puis **le texte de la carte tel quel** ou **laisser l'IA rédiger les phrases**.",
   "Appuyez sur **Envoyer** : le document s'ouvre dans un nouvel onglet de la même fenêtre. Le premier enregistrement demande où le ranger."],
  ["Appuyez sur **Envoyer vers un document › Synchroniser avec les documents liés** pour voir ce qui a changé dans la carte et dans le document HWP.",
   "Les modifications faites dans la carte vont au document, et celles du document reviennent à la carte. Quand les deux côtés ont modifié un sujet différemment, choisissez la carte, le document ou plus tard.",
   "Les phrases écrites dans le document sont conservées. Les documents Word et PowerPoint peuvent être envoyés mais pas encore resynchronisés."],
  ["La carte **Modèles Hanpan** de l'accueil ouvre 19 modèles (lettres officielles, rapports, propositions, comptes rendus, plans) en HWP ou en Word."],
  ["Les **Outils Hanpan** au-dessus d'un onglet HWP mettent en forme et vérifient une lettre officielle, adaptent le ton à une génération, marquent une relecture en trois couleurs et construisent une invite structurée.",
   "Les outils qui modifient le document montrent le résultat tout de suite dans l'onglet. Fermer sans enregistrer laisse le fichier tel quel."],
  ["La carte **Design** de l'accueil crée affiches, cartes d'actualité, avis et miniatures.",
   "Appuyez sur **Copier pour coller dans un document**, puis Ctrl+V dans un onglet HWP, Word ou PowerPoint pour insérer la page comme image. Les pages s'enregistrent aussi en PNG et PDF.",
   "Dans une carte, **Envoyer vers un document › Envoyer en cartes d'actualité** crée une carte par branche principale."],
  ["Au premier démarrage, Hanpan cherche une IA sur ce PC (Ollama, LM Studio, vLLM) et l'utilise si vous n'avez pas choisi d'IA.",
   "Pour une autre IA, choisissez-la dans **Paramètres › IA**."]])

T['de'] = latin('de', 'Erste Schritte mit Hanpan', 'Hanpan schickt, was Sie in einer Mindmap geordnet haben, als Hangul-Bericht (HWP), Präsentation oder Word-Bericht in dasselbe Fenster und hält Karte und Dokument im Einklang. Die KI auf diesem PC hat Vorrang.',
 ['Eine Mindmap an ein Dokument senden', 'Karte und Dokument abgleichen', 'Hanpan-Vorlagen', 'Hanpan-Werkzeuge', 'Design', 'Die KI auf diesem PC'],
 [['Drücken Sie in der Mindmap-Werkzeugleiste **An ein Dokument senden** und wählen Sie HWP-Bericht, PowerPoint oder Word-Bericht.',
   'Wählen Sie das Layout (Stichpunktbericht, Bericht mit Kapiteln, Nummerierung amtlicher Schreiben), Datum und Abteilung sowie **genau den Text der Karte** oder **die KI die Sätze schreiben lassen**.',
   'Drücken Sie **Senden**: Das Dokument öffnet sich in einem neuen Tab desselben Fensters. Beim ersten Speichern wird nach dem Ort gefragt.'],
  ['Drücken Sie **An ein Dokument senden › Mit verknüpften Dokumenten abgleichen**, um zu sehen, was sich in Karte und HWP-Dokument geändert hat.',
   'Änderungen in der Karte gehen ins Dokument, Änderungen im Dokument kommen in die Karte. Wo beide Seiten ein Thema unterschiedlich geändert haben, wählen Sie Karte, Dokument oder später.',
   'Im Dokument geschriebene Sätze bleiben erhalten. Word- und PowerPoint-Dokumente lassen sich senden, aber noch nicht zurück abgleichen.'],
  ['Die Karte **Hanpan-Vorlagen** auf der Startseite öffnet 19 Vorlagen (amtliche Schreiben, Berichte, Angebote, Protokolle, Pläne) als HWP oder Word.'],
  ['Die **Hanpan-Werkzeuge** über einem HWP-Tab ordnen und prüfen ein amtliches Schreiben, passen den Ton an eine Generation an, markieren eine Dreifarben-Prüfung und bauen einen strukturierten Prompt.',
   'Werkzeuge, die das Dokument ändern, zeigen das Ergebnis sofort im Tab. Schließen ohne Speichern lässt die Datei unverändert.'],
  ['Die Karte **Design** auf der Startseite erstellt Plakate, Karten-News, Aushänge und Vorschaubilder.',
   'Drücken Sie **Zum Einfügen in ein Dokument kopieren** und dann Strg+V in einem HWP-, Word- oder PowerPoint-Tab, um die Seite als Bild einzufügen. Seiten lassen sich auch als PNG und PDF speichern.',
   'In einer Mindmap erstellt **An ein Dokument senden › Als Karten-News senden** eine Karte je Hauptzweig.'],
  ['Beim ersten Start sucht Hanpan eine KI auf diesem PC (Ollama, LM Studio, vLLM) und nutzt sie, wenn Sie noch keine KI gewählt haben.',
   'Eine andere KI wählen Sie unter **Einstellungen › KI**.']])

T['es'] = latin('es', 'Primeros pasos con Hanpan', 'Hanpan envía lo que ordenaste en un mapa mental a un informe Hangul (HWP), una presentación o un informe de Word en la misma ventana, y mantiene el mapa y el documento de acuerdo. La IA de este PC va primero.',
 ['Enviar un mapa mental a un documento', 'Sincronizar el mapa y el documento', 'Plantillas de Hanpan', 'Herramientas de Hanpan', 'Diseño', 'La IA de este PC'],
 [['En la barra del mapa, pulsa **Enviar a un documento** y elige un informe HWP, PowerPoint o un informe de Word.',
   'Elige el formato (informe por puntos, informe con capítulos, numeración de carta oficial), la fecha y el departamento, y si enviar **el texto del mapa tal cual** o **dejar que la IA escriba las frases**.',
   'Pulsa **Enviar**: el documento se abre en una pestaña nueva de la misma ventana. El primer guardado pregunta dónde guardarlo.'],
  ['Pulsa **Enviar a un documento › Sincronizar con documentos vinculados** para ver qué cambió en el mapa y en el documento HWP.',
   'Los cambios hechos en el mapa van al documento y los del documento vuelven al mapa. Si ambos lados cambiaron un tema de forma distinta, elige el del mapa, el del documento o más tarde.',
   'Las frases escritas en el documento se conservan. Los documentos de Word y PowerPoint se pueden enviar, pero aún no se sincronizan de vuelta.'],
  ['La tarjeta **Plantillas de Hanpan** del inicio abre 19 plantillas (cartas oficiales, informes, propuestas, actas, planes) como HWP o Word.'],
  ['Las **Herramientas de Hanpan** sobre una pestaña HWP ordenan y revisan una carta oficial, adaptan el tono a una generación, marcan una revisión en tres colores y crean una instrucción estructurada.',
   'Las herramientas que cambian el documento muestran el resultado al momento en la pestaña. Cerrar sin guardar deja el archivo como estaba.'],
  ['La tarjeta **Diseño** del inicio crea carteles, tarjetas de noticias, avisos y miniaturas.',
   'Pulsa **Copiar para pegar en un documento** y luego Ctrl+V en una pestaña HWP, Word o PowerPoint para insertar la página como imagen. Las páginas también se guardan en PNG y PDF.',
   'En un mapa, **Enviar a un documento › Enviar como tarjetas de noticias** crea una tarjeta por cada rama principal.'],
  ['Al primer inicio, Hanpan busca una IA en este PC (Ollama, LM Studio, vLLM) y la usa si aún no elegiste una IA.',
   'Para usar otra IA, elígela en **Ajustes › IA**.']])

T['it'] = latin('it', 'Per iniziare con Hanpan', 'Hanpan invia ciò che hai organizzato in una mappa mentale a un rapporto Hangul (HWP), una presentazione o un rapporto Word nella stessa finestra, e tiene allineati mappa e documento. L’IA di questo PC viene prima.',
 ['Inviare una mappa mentale a un documento', 'Allineare mappa e documento', 'Modelli Hanpan', 'Strumenti Hanpan', 'Design', 'L’IA di questo PC'],
 [['Nella barra della mappa premi **Invia a un documento** e scegli un rapporto HWP, PowerPoint o un rapporto Word.',
   'Scegli il layout (rapporto a punti, rapporto a capitoli, numerazione da lettera ufficiale), la data e l’ufficio, e se inviare **il testo della mappa così com’è** o **far scrivere le frasi all’IA**.',
   'Premi **Invia**: il documento si apre in una nuova scheda della stessa finestra. Il primo salvataggio chiede dove salvarlo.'],
  ['Premi **Invia a un documento › Sincronizza con i documenti collegati** per vedere cosa è cambiato nella mappa e nel documento HWP.',
   'Le modifiche fatte nella mappa vanno al documento e quelle del documento tornano alla mappa. Se le due parti hanno cambiato un argomento in modo diverso, scegli la mappa, il documento o più tardi.',
   'Le frasi scritte nel documento restano. I documenti Word e PowerPoint si possono inviare ma non ancora risincronizzare.'],
  ['La scheda **Modelli Hanpan** nella Home apre 19 modelli (lettere ufficiali, rapporti, proposte, verbali, piani) come HWP o Word.'],
  ['Gli **Strumenti Hanpan** sopra una scheda HWP sistemano e controllano una lettera ufficiale, adattano il tono a una generazione, segnano una revisione a tre colori e costruiscono un prompt strutturato.',
   'Gli strumenti che cambiano il documento mostrano subito il risultato nella scheda. Chiudere senza salvare lascia il file com’era.'],
  ['La scheda **Design** nella Home crea poster, schede notizie, avvisi e miniature.',
   'Premi **Copia per incollare in un documento**, poi Ctrl+V in una scheda HWP, Word o PowerPoint per inserire la pagina come immagine. Le pagine si salvano anche in PNG e PDF.',
   'In una mappa, **Invia a un documento › Invia come schede notizie** crea una scheda per ogni ramo principale.'],
  ['Al primo avvio Hanpan cerca un’IA su questo PC (Ollama, LM Studio, vLLM) e la usa se non hai ancora scelto un’IA.',
   'Per un’altra IA, sceglila in **Impostazioni › IA**.']])

T['pt'] = latin('pt', 'Primeiros passos com o Hanpan', 'O Hanpan envia o que você organizou num mapa mental para um relatório Hangul (HWP), uma apresentação ou um relatório Word na mesma janela, e mantém o mapa e o documento em sintonia. A IA deste PC vem primeiro.',
 ['Enviar um mapa mental para um documento', 'Sincronizar o mapa e o documento', 'Modelos do Hanpan', 'Ferramentas do Hanpan', 'Design', 'A IA deste PC'],
 [['Na barra do mapa, pressione **Enviar para um documento** e escolha um relatório HWP, PowerPoint ou um relatório Word.',
   'Escolha o layout (relatório em tópicos, relatório com capítulos, numeração de ofício), a data e o setor, e se envia **exatamente o texto do mapa** ou **deixa a IA escrever as frases**.',
   'Pressione **Enviar**: o documento abre numa nova aba da mesma janela. O primeiro salvamento pergunta onde guardá-lo.'],
  ['Pressione **Enviar para um documento › Sincronizar com documentos vinculados** para ver o que mudou no mapa e no documento HWP.',
   'O que mudou no mapa vai para o documento, e o que mudou no documento volta ao mapa. Quando os dois lados mudaram um tópico de forma diferente, escolha o do mapa, o do documento ou depois.',
   'As frases escritas no documento são mantidas. Documentos Word e PowerPoint podem ser enviados, mas ainda não são sincronizados de volta.'],
  ['O cartão **Modelos do Hanpan** no Início abre 19 modelos (ofícios, relatórios, propostas, atas, planos) como HWP ou Word.'],
  ['As **Ferramentas do Hanpan** acima de uma aba HWP arrumam e conferem um ofício, ajustam o tom para uma geração, marcam uma revisão em três cores e montam um prompt estruturado.',
   'As ferramentas que mudam o documento mostram o resultado na aba na hora. Fechar sem salvar deixa o arquivo como estava.'],
  ['O cartão **Design** no Início cria cartazes, cards de notícias, avisos e miniaturas.',
   'Pressione **Copiar para colar num documento** e depois Ctrl+V numa aba HWP, Word ou PowerPoint para inserir a página como imagem. As páginas também são salvas em PNG e PDF.',
   'Num mapa, **Enviar para um documento › Enviar como cards de notícias** cria um card por ramo principal.'],
  ['Na primeira abertura, o Hanpan procura uma IA neste PC (Ollama, LM Studio, vLLM) e a usa se você ainda não escolheu uma IA.',
   'Para usar outra IA, escolha-a em **Configurações › IA**.']])

T['nl'] = latin('nl', 'Aan de slag met Hanpan', 'Hanpan stuurt wat u in een mindmap hebt geordend naar een Hangul-rapport (HWP), een presentatie of een Word-rapport in hetzelfde venster, en houdt kaart en document op één lijn. De AI op deze pc gaat voor.',
 ['Een mindmap naar een document sturen', 'Kaart en document gelijkzetten', 'Hanpan-sjablonen', 'Hanpan-hulpmiddelen', 'Ontwerp', 'De AI op deze pc'],
 [['Druk in de werkbalk van de kaart op **Naar een document sturen** en kies een HWP-rapport, PowerPoint of een Word-rapport.',
   'Kies de opmaak (puntsgewijs rapport, rapport met hoofdstukken, nummering van een officiële brief), de datum en de afdeling, en of u **precies de tekst van de kaart** stuurt of **de AI de zinnen laat schrijven**.',
   'Druk op **Sturen**: het document opent in een nieuw tabblad van hetzelfde venster. Bij de eerste keer opslaan wordt gevraagd waar.'],
  ['Druk op **Naar een document sturen › Gelijkzetten met gekoppelde documenten** om te zien wat er in de kaart en in het HWP-document is veranderd.',
   'Wijzigingen in de kaart gaan naar het document, wijzigingen in het document komen naar de kaart. Waar beide kanten een onderwerp anders hebben gewijzigd, kiest u die van de kaart, die van het document of later.',
   'Zinnen die in het document zijn geschreven, blijven staan. Word- en PowerPoint-documenten kunnen worden verstuurd, maar nog niet terug gelijkgezet.'],
  ['De kaart **Hanpan-sjablonen** op Start opent 19 sjablonen (officiële brieven, rapporten, voorstellen, notulen, plannen) als HWP of Word.'],
  ['De **Hanpan-hulpmiddelen** boven een HWP-tabblad ordenen en controleren een officiële brief, passen de toon aan op een generatie, markeren een driekleurenbeoordeling en bouwen een gestructureerde prompt.',
   'Hulpmiddelen die het document wijzigen, tonen het resultaat meteen in het tabblad. Sluiten zonder opslaan laat het bestand ongewijzigd.'],
  ['De kaart **Ontwerp** op Start maakt posters, nieuwskaarten, mededelingen en miniaturen.',
   'Druk op **Kopiëren om in een document te plakken** en daarna op Ctrl+V in een HWP-, Word- of PowerPoint-tabblad om de pagina als afbeelding in te voegen. Pagina’s worden ook als PNG en PDF opgeslagen.',
   'In een kaart maakt **Naar een document sturen › Als nieuwskaarten sturen** één kaart per hoofdtak.'],
  ['Bij de eerste start zoekt Hanpan een AI op deze pc (Ollama, LM Studio, vLLM) en gebruikt die als u nog geen AI hebt gekozen.',
   'Kies een andere AI via **Instellingen › AI**.']])

T['pl'] = latin('pl', 'Pierwsze kroki z Hanpan', 'Hanpan wysyła to, co uporządkowałeś na mapie myśli, do raportu Hangul (HWP), prezentacji lub raportu Word w tym samym oknie i utrzymuje zgodność mapy z dokumentem. Najpierw używa AI z tego komputera.',
 ['Wysyłanie mapy myśli do dokumentu', 'Uzgadnianie mapy i dokumentu', 'Szablony Hanpan', 'Narzędzia Hanpan', 'Projekt', 'AI na tym komputerze'],
 [['Na pasku narzędzi mapy naciśnij **Wyślij do dokumentu** i wybierz raport HWP, PowerPoint lub raport Word.',
   'Wybierz układ (raport w punktach, raport z rozdziałami, numeracja pisma urzędowego), datę i dział oraz to, czy wysłać **dokładnie tekst z mapy**, czy **pozwolić AI napisać zdania**.',
   'Naciśnij **Wyślij**: dokument otworzy się w nowej karcie tego samego okna. Przy pierwszym zapisie pojawi się pytanie o miejsce.'],
  ['Naciśnij **Wyślij do dokumentu › Uzgodnij z połączonymi dokumentami**, aby zobaczyć, co zmieniło się na mapie i w dokumencie HWP.',
   'Zmiany z mapy trafiają do dokumentu, a zmiany z dokumentu wracają na mapę. Gdy obie strony zmieniły temat inaczej, wybierz wersję mapy, dokumentu albo później.',
   'Zdania napisane w dokumencie zostają. Dokumenty Word i PowerPoint można wysłać, ale jeszcze nie uzgodnić z powrotem.'],
  ['Karta **Szablony Hanpan** na ekranie startowym otwiera 19 szablonów (pisma urzędowe, raporty, oferty, protokoły, plany) jako HWP lub Word.'],
  ['**Narzędzia Hanpan** nad kartą HWP porządkują i sprawdzają pismo urzędowe, dostosowują ton do pokolenia, zaznaczają przegląd w trzech kolorach i budują uporządkowany prompt.',
   'Narzędzia zmieniające dokument od razu pokazują wynik w karcie. Zamknięcie bez zapisu pozostawia plik bez zmian.'],
  ['Karta **Projekt** na ekranie startowym tworzy plakaty, karty informacyjne, ogłoszenia i miniatury.',
   'Naciśnij **Kopiuj do wklejenia w dokumencie**, a potem Ctrl+V w karcie HWP, Word lub PowerPoint, aby wstawić stronę jako obraz. Strony można też zapisać jako PNG i PDF.',
   'Na mapie **Wyślij do dokumentu › Wyślij jako karty informacyjne** tworzy jedną kartę na każdą główną gałąź.'],
  ['Przy pierwszym uruchomieniu Hanpan szuka AI na tym komputerze (Ollama, LM Studio, vLLM) i używa jej, jeśli nie wybrałeś jeszcze AI.',
   'Inną AI wybierzesz w **Ustawienia › AI**.']])

T['cs'] = latin('cs', 'Začínáme s Hanpan', 'Hanpan pošle to, co jste uspořádali v myšlenkové mapě, do zprávy Hangul (HWP), prezentace nebo zprávy Word ve stejném okně a udržuje mapu a dokument v souladu. Přednost má AI na tomto počítači.',
 ['Odeslání myšlenkové mapy do dokumentu', 'Sladění mapy a dokumentu', 'Šablony Hanpan', 'Nástroje Hanpan', 'Návrh', 'AI na tomto počítači'],
 [['Na panelu nástrojů mapy stiskněte **Odeslat do dokumentu** a vyberte zprávu HWP, PowerPoint nebo zprávu Word.',
   'Vyberte rozvržení (zpráva v bodech, zpráva s kapitolami, číslování úředního dopisu), datum a oddělení a zda poslat **přesně text mapy**, nebo **nechat věty napsat AI**.',
   'Stiskněte **Odeslat**: dokument se otevře na nové kartě stejného okna. Při prvním uložení se zeptá, kam jej uložit.'],
  ['Stiskněte **Odeslat do dokumentu › Sladit s propojenými dokumenty** a uvidíte, co se změnilo v mapě a v dokumentu HWP.',
   'Změny v mapě jdou do dokumentu, změny v dokumentu se vrací do mapy. Kde obě strany změnily téma jinak, vyberte verzi mapy, dokumentu nebo později.',
   'Věty napsané v dokumentu zůstanou. Dokumenty Word a PowerPoint lze odeslat, ale zatím ne sladit zpět.'],
  ['Karta **Šablony Hanpan** na úvodní obrazovce otevře 19 šablon (úřední dopisy, zprávy, návrhy, zápisy, plány) jako HWP nebo Word.'],
  ['**Nástroje Hanpan** nad kartou HWP upraví a zkontrolují úřední dopis, přizpůsobí tón generaci, vyznačí tříbarevnou kontrolu a sestaví strukturovaný prompt.',
   'Nástroje, které mění dokument, ukážou výsledek hned na kartě. Zavření bez uložení nechá soubor beze změny.'],
  ['Karta **Návrh** na úvodní obrazovce vytváří plakáty, karty se zprávami, oznámení a náhledy.',
   'Stiskněte **Kopírovat pro vložení do dokumentu** a pak Ctrl+V na kartě HWP, Word nebo PowerPoint, čímž stránku vložíte jako obrázek. Stránky lze uložit i jako PNG a PDF.',
   'V mapě **Odeslat do dokumentu › Odeslat jako karty se zprávami** vytvoří jednu kartu na každou hlavní větev.'],
  ['Při prvním spuštění Hanpan hledá AI na tomto počítači (Ollama, LM Studio, vLLM) a použije ji, pokud jste ještě žádnou AI nevybrali.',
   'Jinou AI vyberete v **Nastavení › AI**.']])

T['id'] = latin('id', 'Memulai Hanpan', 'Hanpan mengirim apa yang Anda susun di peta pikiran ke laporan Hangul (HWP), presentasi, atau laporan Word di jendela yang sama, dan menjaga peta serta dokumen tetap selaras. AI di PC ini didahulukan.',
 ['Mengirim peta pikiran ke dokumen', 'Menyelaraskan peta dan dokumen', 'Templat Hanpan', 'Alat Hanpan', 'Desain', 'AI di PC ini'],
 [['Di bilah alat peta, tekan **Kirim ke dokumen** lalu pilih laporan HWP, PowerPoint, atau laporan Word.',
   'Pilih tata letak (laporan poin, laporan berbab, penomoran surat resmi), tanggal dan bagian, serta apakah mengirim **persis teks di peta** atau **membiarkan AI menulis kalimat**.',
   'Tekan **Kirim**: dokumen terbuka di tab baru pada jendela yang sama. Penyimpanan pertama menanyakan lokasinya.'],
  ['Tekan **Kirim ke dokumen › Selaraskan dengan dokumen tertaut** untuk melihat apa yang berubah di peta dan di dokumen HWP.',
   'Perubahan di peta masuk ke dokumen, dan perubahan di dokumen kembali ke peta. Bila kedua sisi mengubah topik secara berbeda, pilih versi peta, versi dokumen, atau nanti.',
   'Kalimat yang ditulis di dokumen tetap ada. Dokumen Word dan PowerPoint bisa dikirim tetapi belum bisa diselaraskan kembali.'],
  ['Kartu **Templat Hanpan** di Beranda membuka 19 templat (surat resmi, laporan, proposal, notulen, rencana) sebagai HWP atau Word.'],
  ['**Alat Hanpan** di atas tab HWP merapikan dan memeriksa surat resmi, menyesuaikan nada untuk suatu generasi, menandai tinjauan tiga warna, dan menyusun prompt terstruktur.',
   'Alat yang mengubah dokumen langsung menampilkan hasilnya di tab. Menutup tanpa menyimpan membiarkan berkas seperti semula.'],
  ['Kartu **Desain** di Beranda membuat poster, kartu berita, pengumuman, dan gambar mini.',
   'Tekan **Salin untuk ditempel di dokumen**, lalu Ctrl+V di tab HWP, Word, atau PowerPoint untuk menyisipkan halaman sebagai gambar. Halaman juga bisa disimpan sebagai PNG dan PDF.',
   'Di peta, **Kirim ke dokumen › Kirim sebagai kartu berita** membuat satu kartu untuk tiap cabang utama.'],
  ['Saat pertama dibuka, Hanpan mencari AI di PC ini (Ollama, LM Studio, vLLM) dan memakainya bila Anda belum memilih AI.',
   'Untuk AI lain, pilih di **Pengaturan › AI**.']])

T['ms'] = latin('ms', 'Bermula dengan Hanpan', 'Hanpan menghantar apa yang anda susun dalam peta minda ke laporan Hangul (HWP), persembahan atau laporan Word dalam tetingkap yang sama, dan memastikan peta serta dokumen kekal sepadan. AI pada PC ini diutamakan.',
 ['Menghantar peta minda ke dokumen', 'Menyelaraskan peta dan dokumen', 'Templat Hanpan', 'Alat Hanpan', 'Reka bentuk', 'AI pada PC ini'],
 [['Dalam bar alat peta, tekan **Hantar ke dokumen** dan pilih laporan HWP, PowerPoint atau laporan Word.',
   'Pilih susun atur (laporan berpoin, laporan berbab, penomboran surat rasmi), tarikh dan bahagian, serta sama ada menghantar **teks peta seadanya** atau **membiarkan AI menulis ayat**.',
   'Tekan **Hantar**: dokumen dibuka dalam tab baharu tetingkap yang sama. Simpanan pertama bertanya di mana hendak menyimpannya.'],
  ['Tekan **Hantar ke dokumen › Selaraskan dengan dokumen berpaut** untuk melihat apa yang berubah dalam peta dan dokumen HWP.',
   'Perubahan dalam peta pergi ke dokumen, dan perubahan dalam dokumen kembali ke peta. Jika kedua-dua pihak mengubah topik secara berbeza, pilih versi peta, versi dokumen atau kemudian.',
   'Ayat yang ditulis dalam dokumen dikekalkan. Dokumen Word dan PowerPoint boleh dihantar tetapi belum boleh diselaraskan semula.'],
  ['Kad **Templat Hanpan** di Laman Utama membuka 19 templat (surat rasmi, laporan, cadangan, minit, rancangan) sebagai HWP atau Word.'],
  ['**Alat Hanpan** di atas tab HWP mengemas dan menyemak surat rasmi, menyesuaikan nada untuk sesuatu generasi, menandakan semakan tiga warna dan membina gesaan berstruktur.',
   'Alat yang mengubah dokumen terus menunjukkan hasil dalam tab. Menutup tanpa menyimpan membiarkan fail seperti asal.'],
  ['Kad **Reka bentuk** di Laman Utama membuat poster, kad berita, notis dan gambar kecil.',
   'Tekan **Salin untuk ditampal dalam dokumen**, kemudian Ctrl+V dalam tab HWP, Word atau PowerPoint untuk memasukkan halaman sebagai gambar. Halaman juga boleh disimpan sebagai PNG dan PDF.',
   'Dalam peta, **Hantar ke dokumen › Hantar sebagai kad berita** membuat satu kad bagi setiap cabang utama.'],
  ['Pada permulaan pertama, Hanpan mencari AI pada PC ini (Ollama, LM Studio, vLLM) dan menggunakannya jika anda belum memilih AI.',
   'Untuk AI lain, pilih dalam **Tetapan › AI**.']])

T['vi'] = latin('vi', 'Bắt đầu với Hanpan', 'Hanpan gửi những gì bạn sắp xếp trong sơ đồ tư duy thành báo cáo Hangul (HWP), bản trình chiếu hoặc báo cáo Word trong cùng cửa sổ, và giữ sơ đồ với tài liệu khớp nhau. AI trên máy tính này được ưu tiên.',
 ['Gửi sơ đồ tư duy sang tài liệu', 'Đồng bộ sơ đồ và tài liệu', 'Mẫu Hanpan', 'Công cụ Hanpan', 'Thiết kế', 'AI trên máy tính này'],
 [['Trên thanh công cụ của sơ đồ, nhấn **Gửi sang tài liệu** rồi chọn báo cáo HWP, PowerPoint hoặc báo cáo Word.',
   'Chọn bố cục (báo cáo gạch đầu dòng, báo cáo có chương, đánh số công văn), ngày và bộ phận, rồi chọn gửi **đúng chữ trong sơ đồ** hay **để AI viết câu**.',
   'Nhấn **Gửi**: tài liệu mở trong một thẻ mới của cùng cửa sổ. Lần lưu đầu tiên sẽ hỏi nơi lưu.'],
  ['Nhấn **Gửi sang tài liệu › Đồng bộ với tài liệu liên kết** để xem những gì đã thay đổi trong sơ đồ và tài liệu HWP.',
   'Thay đổi trong sơ đồ đi sang tài liệu, thay đổi trong tài liệu quay về sơ đồ. Khi hai bên sửa một chủ đề khác nhau, hãy chọn bản của sơ đồ, của tài liệu hoặc để sau.',
   'Các câu đã viết trong tài liệu được giữ nguyên. Tài liệu Word và PowerPoint gửi được nhưng chưa đồng bộ ngược lại.'],
  ['Thẻ **Mẫu Hanpan** ở Trang chủ mở 19 mẫu (công văn, báo cáo, đề xuất, biên bản, kế hoạch) dạng HWP hoặc Word.'],
  ['**Công cụ Hanpan** phía trên thẻ HWP chỉnh và kiểm tra công văn, đổi giọng văn theo thế hệ, đánh dấu rà soát ba màu và dựng lời nhắc có cấu trúc.',
   'Công cụ thay đổi tài liệu hiển thị kết quả ngay trong thẻ. Đóng mà không lưu thì tệp vẫn như cũ.'],
  ['Thẻ **Thiết kế** ở Trang chủ tạo áp phích, thẻ tin, thông báo và ảnh thu nhỏ.',
   'Nhấn **Sao chép để dán vào tài liệu**, rồi Ctrl+V trong thẻ HWP, Word hoặc PowerPoint để chèn trang dưới dạng ảnh. Trang cũng lưu được dạng PNG và PDF.',
   'Trong sơ đồ, **Gửi sang tài liệu › Gửi thành thẻ tin** tạo một thẻ cho mỗi nhánh chính.'],
  ['Lần khởi động đầu, Hanpan tìm AI trên máy tính này (Ollama, LM Studio, vLLM) và dùng nó nếu bạn chưa chọn AI.',
   'Để dùng AI khác, chọn trong **Cài đặt › AI**.']])

T['ru'] = latin('ru', 'Начало работы с Hanpan', 'Hanpan отправляет то, что вы упорядочили в интеллект-карте, в отчёт Hangul (HWP), презентацию или отчёт Word в том же окне и поддерживает согласие карты и документа. Сначала используется ИИ на этом компьютере.',
 ['Отправка интеллект-карты в документ', 'Синхронизация карты и документа', 'Шаблоны Hanpan', 'Инструменты Hanpan', 'Дизайн', 'ИИ на этом компьютере'],
 [['На панели инструментов карты нажмите **Отправить в документ** и выберите отчёт HWP, PowerPoint или отчёт Word.',
   'Выберите макет (отчёт по пунктам, отчёт с главами, нумерация служебного письма), дату и отдел, а также отправить **текст карты как есть** или **поручить ИИ написать предложения**.',
   'Нажмите **Отправить**: документ откроется в новой вкладке того же окна. При первом сохранении будет спрошено, куда сохранить.'],
  ['Нажмите **Отправить в документ › Синхронизировать со связанными документами**, чтобы увидеть изменения в карте и в документе HWP.',
   'Изменения в карте переходят в документ, изменения в документе возвращаются в карту. Если обе стороны изменили тему по-разному, выберите вариант карты, документа или «позже».',
   'Предложения, написанные в документе, сохраняются. Документы Word и PowerPoint можно отправить, но пока нельзя синхронизировать обратно.'],
  ['Карточка **Шаблоны Hanpan** на главной открывает 19 шаблонов (служебные письма, отчёты, предложения, протоколы, планы) в HWP или Word.'],
  ['**Инструменты Hanpan** над вкладкой HWP приводят в порядок и проверяют служебное письмо, меняют тон для поколения, отмечают трёхцветную проверку и собирают структурированный запрос.',
   'Инструменты, меняющие документ, сразу показывают результат во вкладке. Если закрыть без сохранения, файл останется прежним.'],
  ['Карточка **Дизайн** на главной создаёт плакаты, карточки новостей, объявления и обложки.',
   'Нажмите **Копировать для вставки в документ**, затем Ctrl+V во вкладке HWP, Word или PowerPoint, чтобы вставить страницу как картинку. Страницы также сохраняются в PNG и PDF.',
   'В карте **Отправить в документ › Отправить в карточки** создаёт по карточке на каждую главную ветвь.'],
  ['При первом запуске Hanpan ищет ИИ на этом компьютере (Ollama, LM Studio, vLLM) и использует его, если вы ещё не выбрали ИИ.',
   'Чтобы выбрать другой ИИ, откройте **Настройки › ИИ**.']])

T['ar'] = latin('ar', 'البدء مع Hanpan', 'يرسل Hanpan ما رتّبته في خريطة ذهنية إلى تقرير Hangul ‏(HWP) أو عرض تقديمي أو تقرير Word في النافذة نفسها، ويُبقي الخريطة والمستند متوافقين. يُستخدم الذكاء الاصطناعي الموجود على هذا الحاسوب أولًا.',
 ['إرسال خريطة ذهنية إلى مستند', 'مزامنة الخريطة والمستند', 'قوالب Hanpan', 'أدوات Hanpan', 'التصميم', 'الذكاء الاصطناعي على هذا الحاسوب'],
 [['في شريط أدوات الخريطة اضغط **إرسال إلى مستند** واختر تقرير HWP أو PowerPoint أو تقرير Word.',
   'اختر التخطيط (تقرير بنقاط، تقرير بفصول، ترقيم خطاب رسمي) والتاريخ والقسم، وهل ترسل **نص الخريطة كما هو** أم **تدع الذكاء الاصطناعي يكتب الجمل**.',
   'اضغط **إرسال**: يُفتح المستند في علامة تبويب جديدة في النافذة نفسها. يسأل الحفظ الأول عن مكان الحفظ.'],
  ['اضغط **إرسال إلى مستند › مزامنة مع المستندات المرتبطة** لترى ما تغيّر في الخريطة وفي مستند HWP.',
   'تنتقل تغييرات الخريطة إلى المستند وتعود تغييرات المستند إلى الخريطة. حيث غيّر الطرفان موضوعًا بشكل مختلف، اختر نسخة الخريطة أو المستند أو لاحقًا.',
   'تبقى الجمل المكتوبة في المستند. يمكن إرسال مستندات Word وPowerPoint لكن لا تُزامن عكسيًا بعد.'],
  ['تفتح بطاقة **قوالب Hanpan** في الصفحة الرئيسية 19 قالبًا (خطابات رسمية، تقارير، عروض، محاضر، خطط) بصيغة HWP أو Word.'],
  ['تنظّم **أدوات Hanpan** فوق تبويب HWP الخطاب الرسمي وتفحصه، وتغيّر النبرة لجيل معيّن، وتعلّم مراجعة بثلاثة ألوان، وتبني موجّهًا منظّمًا.',
   'الأدوات التي تغيّر المستند تعرض النتيجة في التبويب فورًا. الإغلاق دون حفظ يترك الملف كما كان.'],
  ['تصنع بطاقة **التصميم** في الصفحة الرئيسية ملصقات وبطاقات أخبار وإعلانات وصورًا مصغّرة.',
   'اضغط **نسخ للصق في مستند** ثم Ctrl+V في تبويب HWP أو Word أو PowerPoint لإدراج الصفحة كصورة. وتُحفظ الصفحات أيضًا بصيغة PNG وPDF.',
   'في الخريطة، ينشئ **إرسال إلى مستند › إرسال إلى بطاقات أخبار** بطاقة لكل فرع رئيسي.'],
  ['عند أول تشغيل يبحث Hanpan عن ذكاء اصطناعي على هذا الحاسوب (Ollama وLM Studio وvLLM) ويستخدمه إن لم تكن اخترت ذكاءً اصطناعيًا.',
   'لاستخدام ذكاء اصطناعي آخر، اختره من **الإعدادات › الذكاء الاصطناعي**.']])

T['he'] = latin('he', 'צעדים ראשונים עם Hanpan', 'Hanpan שולח את מה שסידרתם במפת חשיבה לדוח Hangul ‏(HWP), למצגת או לדוח Word באותו חלון, ושומר על התאמה בין המפה למסמך. ה-AI שבמחשב הזה קודם.',
 ['שליחת מפת חשיבה למסמך', 'סנכרון המפה והמסמך', 'תבניות Hanpan', 'כלי Hanpan', 'עיצוב', 'ה-AI שבמחשב הזה'],
 [['בסרגל הכלים של המפה לחצו **שליחה למסמך** ובחרו דוח HWP,‏ PowerPoint או דוח Word.',
   'בחרו פריסה (דוח בנקודות, דוח עם פרקים, מספור מכתב רשמי), תאריך ומחלקה, והאם לשלוח **בדיוק את הטקסט שבמפה** או **לתת ל-AI לכתוב את המשפטים**.',
   'לחצו **שליחה**: המסמך נפתח בכרטיסייה חדשה באותו חלון. בשמירה הראשונה תישאלו היכן לשמור.'],
  ['לחצו **שליחה למסמך › סנכרון עם מסמכים מקושרים** כדי לראות מה השתנה במפה ובמסמך ה-HWP.',
   'שינויים במפה עוברים למסמך, ושינויים במסמך חוזרים למפה. כששני הצדדים שינו נושא באופן שונה, בחרו את גרסת המפה, את גרסת המסמך או אחר כך.',
   'משפטים שנכתבו במסמך נשמרים. מסמכי Word ו-PowerPoint אפשר לשלוח, אך עדיין לא לסנכרן בחזרה.'],
  ['הכרטיס **תבניות Hanpan** במסך הבית פותח 19 תבניות (מכתבים רשמיים, דוחות, הצעות, פרוטוקולים, תוכניות) כ-HWP או כ-Word.'],
  ['**כלי Hanpan** מעל כרטיסיית HWP מסדרים ובודקים מכתב רשמי, מתאימים את הטון לדור, מסמנים בדיקה בשלושה צבעים ובונים הנחיה מובנית.',
   'כלים שמשנים את המסמך מציגים את התוצאה בכרטיסייה מיד. סגירה בלי שמירה משאירה את הקובץ כפי שהיה.'],
  ['הכרטיס **עיצוב** במסך הבית יוצר פוסטרים, כרטיסי חדשות, הודעות ותמונות ממוזערות.',
   'לחצו **העתקה להדבקה במסמך**, ואז Ctrl+V בכרטיסיית HWP,‏ Word או PowerPoint כדי להכניס את העמוד כתמונה. אפשר גם לשמור עמודים כ-PNG וכ-PDF.',
   'במפה, **שליחה למסמך › שליחה לכרטיסי חדשות** יוצרת כרטיס לכל ענף ראשי.'],
  ['בהפעלה הראשונה Hanpan מחפש AI במחשב הזה (Ollama,‏ LM Studio,‏ vLLM) ומשתמש בו אם עוד לא בחרתם AI.',
   'כדי להשתמש ב-AI אחר, בחרו אותו ב**הגדרות › AI**.']])

T['hi'] = latin('hi', 'Hanpan से शुरुआत', 'Hanpan माइंड मैप में आपने जो व्यवस्थित किया उसे उसी विंडो में Hangul (HWP) रिपोर्ट, प्रस्तुति या Word रिपोर्ट में भेजता है, और मानचित्र व दस्तावेज़ को मेल में रखता है। पहले इस पीसी का AI इस्तेमाल होता है।',
 ['माइंड मैप को दस्तावेज़ में भेजना', 'मानचित्र और दस्तावेज़ का मिलान', 'Hanpan टेम्पलेट', 'Hanpan टूल', 'डिज़ाइन', 'इस पीसी का AI'],
 [['मानचित्र के टूलबार में **दस्तावेज़ में भेजें** दबाएँ और HWP रिपोर्ट, PowerPoint या Word रिपोर्ट चुनें।',
   'लेआउट (बिंदुवार रिपोर्ट, अध्यायों वाली रिपोर्ट, आधिकारिक पत्र क्रमांकन), तारीख और विभाग चुनें, और तय करें कि **मानचित्र में लिखा जैसा ही** भेजें या **AI से वाक्य लिखवाएँ**।',
   '**भेजें** दबाएँ: दस्तावेज़ उसी विंडो के नए टैब में खुलता है। पहली बार सहेजते समय जगह पूछी जाती है।'],
  ['**दस्तावेज़ में भेजें › जुड़े दस्तावेज़ों से मिलान करें** दबाकर देखें कि मानचित्र और HWP दस्तावेज़ में क्या बदला।',
   'मानचित्र के बदलाव दस्तावेज़ में जाते हैं और दस्तावेज़ के बदलाव मानचित्र में लौटते हैं। जहाँ दोनों ओर किसी विषय को अलग-अलग बदला गया हो, मानचित्र वाला, दस्तावेज़ वाला या बाद में चुनें।',
   'दस्तावेज़ में लिखे वाक्य बने रहते हैं। Word और PowerPoint दस्तावेज़ भेजे जा सकते हैं, पर अभी वापस मिलाए नहीं जाते।'],
  ['होम पर **Hanpan टेम्पलेट** कार्ड 19 टेम्पलेट (आधिकारिक पत्र, रिपोर्ट, प्रस्ताव, कार्यवृत्त, योजनाएँ) HWP या Word में खोलता है।'],
  ['HWP टैब के ऊपर **Hanpan टूल** आधिकारिक पत्र को सुधारते और जाँचते हैं, किसी पीढ़ी के लिए लहजा बदलते हैं, तीन-रंग समीक्षा चिह्नित करते हैं और संरचित प्रॉम्प्ट बनाते हैं।',
   'दस्तावेज़ बदलने वाले टूल परिणाम तुरंत टैब में दिखाते हैं। बिना सहेजे बंद करने पर फ़ाइल पहले जैसी रहती है।'],
  ['होम पर **डिज़ाइन** कार्ड पोस्टर, कार्ड न्यूज़, सूचनाएँ और थंबनेल बनाता है।',
   '**दस्तावेज़ में चिपकाने के लिए कॉपी करें** दबाएँ, फिर HWP, Word या PowerPoint टैब में Ctrl+V दबाकर पेज को चित्र के रूप में डालें। पेज PNG और PDF में भी सहेजे जा सकते हैं।',
   'मानचित्र में **दस्तावेज़ में भेजें › कार्ड न्यूज़ में भेजें** हर मुख्य शाखा के लिए एक कार्ड बनाता है।'],
  ['पहली बार शुरू होने पर Hanpan इस पीसी पर चल रहा AI (Ollama, LM Studio, vLLM) खोजता है और यदि आपने कोई AI नहीं चुना है तो उसका उपयोग करता है।',
   'दूसरा AI चुनने के लिए **सेटिंग्स › AI** खोलें।']])

T['th'] = latin('th', 'เริ่มต้นใช้ Hanpan', 'Hanpan ส่งสิ่งที่คุณจัดไว้ในแผนที่ความคิดไปเป็นรายงาน Hangul (HWP) งานนำเสนอ หรือรายงาน Word ในหน้าต่างเดียวกัน และทำให้แผนที่กับเอกสารตรงกันเสมอ โดยใช้ AI บนพีซีเครื่องนี้ก่อน',
 ['ส่งแผนที่ความคิดไปเป็นเอกสาร', 'ซิงค์แผนที่กับเอกสาร', 'เทมเพลต Hanpan', 'เครื่องมือ Hanpan', 'ออกแบบ', 'AI บนพีซีเครื่องนี้'],
 [['ในแถบเครื่องมือของแผนที่ กด **ส่งไปยังเอกสาร** แล้วเลือกรายงาน HWP, PowerPoint หรือรายงาน Word',
   'เลือกรูปแบบ (รายงานแบบหัวข้อ รายงานแบ่งบท เลขลำดับหนังสือราชการ) วันที่และหน่วยงาน แล้วเลือกส่ง **ตามข้อความในแผนที่** หรือ **ให้ AI เขียนเป็นประโยค**',
   'กด **ส่ง** เอกสารจะเปิดในแท็บใหม่ของหน้าต่างเดียวกัน การบันทึกครั้งแรกจะถามที่จัดเก็บ'],
  ['กด **ส่งไปยังเอกสาร › ซิงค์กับเอกสารที่เชื่อมไว้** เพื่อดูว่าอะไรเปลี่ยนในแผนที่และในเอกสาร HWP',
   'สิ่งที่แก้ในแผนที่จะไปที่เอกสาร และสิ่งที่แก้ในเอกสารจะกลับมาที่แผนที่ ส่วนที่แก้ต่างกันทั้งสองฝั่งให้เลือกตามแผนที่ ตามเอกสาร หรือภายหลัง',
   'ประโยคที่เขียนในเอกสารจะคงอยู่ เอกสาร Word และ PowerPoint ส่งได้แต่ยังซิงค์กลับไม่ได้'],
  ['การ์ด **เทมเพลต Hanpan** ในหน้าแรกเปิดเทมเพลต 19 แบบ (หนังสือราชการ รายงาน ข้อเสนอ บันทึกการประชุม แผนงาน) เป็น HWP หรือ Word'],
  ['**เครื่องมือ Hanpan** เหนือแท็บ HWP ช่วยจัดและตรวจหนังสือราชการ เปลี่ยนน้ำเสียงตามรุ่นวัย ทำเครื่องหมายการตรวจสามสี และสร้างพรอมต์แบบมีโครงสร้าง',
   'เครื่องมือที่แก้เอกสารจะแสดงผลในแท็บทันที หากปิดโดยไม่บันทึก ไฟล์จะคงเดิม'],
  ['การ์ด **ออกแบบ** ในหน้าแรกใช้สร้างโปสเตอร์ การ์ดข่าว ประกาศ และภาพปก',
   'กด **คัดลอกเพื่อวางในเอกสาร** แล้วกด Ctrl+V ในแท็บ HWP, Word หรือ PowerPoint เพื่อใส่หน้าเป็นรูปภาพ หน้ายังบันทึกเป็น PNG และ PDF ได้ด้วย',
   'ในแผนที่ **ส่งไปยังเอกสาร › ส่งเป็นการ์ดข่าว** จะสร้างการ์ดหนึ่งใบต่อกิ่งหลักหนึ่งกิ่ง'],
  ['เมื่อเปิดครั้งแรก Hanpan จะค้นหา AI บนพีซีเครื่องนี้ (Ollama, LM Studio, vLLM) และใช้งาน หากคุณยังไม่ได้เลือก AI',
   'หากต้องการ AI อื่น ให้เลือกใน **การตั้งค่า › AI**']])

for lang, (title, intro, sections) in T.items():
    lines = [f'# {title}', '', intro, '']
    for heading, kind, items in sections:
        lines += [f'## {heading}', '']
        for i, item in enumerate(items, 1):
            lines.append(f'{i}. {item}' if kind == 'ol' else f'- {item}')
        lines.append('')
    (OUT / f'hanpan.{lang}.md').write_text('\n'.join(lines), encoding='utf8')
print(len(T), 'languages')
