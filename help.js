function getDefaultLanguage() {
  var available = ['zh_CN', 'zh_TW', 'en', 'ja', 'ko', 'fr', 'de', 'es'];
  var browserLang = (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) ? chrome.i18n.getUILanguage() : 'en';
  var normalized = browserLang.replace('-', '_');
  if (available.indexOf(normalized) !== -1) return normalized;
  var short = normalized.split('_')[0];
  if (available.indexOf(short) !== -1) return short;
  return 'en';
}

var helpContent = {
  zh_CN: {
    overview: { title: '概述', content: '<p>Smart Proxy 是一款浏览器代理管理扩展，支持延迟测试和网站收藏功能，帮助您高效管理代理配置。</p><h3>主要功能</h3><ul><li>快速切换不同的代理服务器</li><li>实时显示代理延迟（毫秒）</li><li>收藏网站，下次访问自动启用代理</li><li>支持 HTTP、HTTPS、SOCKS4、SOCKS5 代理</li><li>支持代理服务器认证</li><li>支持八国语言界面</li></ul>' },
    addProxy: { title: '添加代理', content: '<ol><li>点击扩展图标打开弹出窗口</li><li>点击 <strong>添加代理</strong> 按钮</li><li>填写代理信息：代理名称、类型、主机地址、端口、用户名/密码</li><li>点击 <strong>保存</strong></li></ol>' },
    useProxy: { title: '使用代理', content: '<ol><li>从下拉框选择要使用的代理</li><li>打开旁边的开关即可启用代理</li><li>状态栏会显示当前连接延迟（毫秒）</li><li>关闭开关则断开代理</li></ol>' },
    latency: { title: '延迟测试', content: '<p>当代理连接成功后，扩展会自动测试代理延迟并在状态栏显示结果（毫秒）。点击延迟数值可以手动刷新。</p>' },
    favorites: { title: '网站收藏', content: '<ol><li>在弹出窗口中选择一个代理</li><li>点击 <strong>收藏</strong> 按钮</li><li>确认后，当前网站会被记住</li><li>下次访问该网站时，代理会自动启用</li><li>在设置页面可以管理收藏列表</li></ol>' },
    modes: { title: '代理模式', content: '<p><strong>注意：收藏域名在任何模式下都会被代理，优先级最高。</strong></p><ul><li><strong>页面模式</strong>：仅代理当前标签页的域名，切换标签页时自动切换代理状态</li><li><strong>全局模式</strong>：代理所有流量</li><li><strong>规则模式</strong>：仅代理预设的不可访问域名和收藏域名</li></ul>' },
    cascade: { title: '级联代理', content: '<p>开启级联代理后，从已代理的标签页中打开的新标签页也会自动代理。可在设置中关闭此功能。</p>' },
    shortcuts: { title: '快捷键', content: '<p>使用键盘快捷键快速切换代理：</p><ul><li>Windows/Linux: <code>Ctrl+Shift+P</code></li><li>macOS: <code>Command+Shift+P</code></li></ul>' },
    settings: { title: '设置页面', content: '<ul><li><strong>启动时恢复代理</strong>：浏览器启动时自动恢复上次代理</li><li><strong>快捷键开关</strong>：启用/禁用快捷键切换</li><li><strong>级联代理</strong>：从代理标签页打开的新标签页也自动代理</li><li><strong>代理白名单</strong>：不经过代理的网站列表</li><li><strong>规则域名</strong>：规则模式下的代理域名列表</li><li><strong>语言设置</strong>：切换界面语言</li></ul>' },
    disclaimer: { title: '声明', content: '<p>本扩展参考了 Chrome 网上应用店中的 <a href="https://chromewebstore.google.com/detail/fjnpcbjdpbhbdlnkncaoennjdkoegmof?utm_source=item-share-cb" target="_blank">Easy Proxy Switcher</a> 扩展，并进行了优化改进。感谢原作者：<strong>xubaifu97</strong>。如有侵权请立即联系删除。</p>' }
  },
  zh_TW: {
    overview: { title: '概述', content: '<p>Smart Proxy 是一款瀏覽器代理管理擴充功能，支援延遲測試和網站收藏功能。</p><h3>主要功能</h3><ul><li>快速切換不同的代理伺服器</li><li>即時顯示代理延遲（毫秒）</li><li>收藏網站，下次訪問自動啟用代理</li><li>支援 HTTP、HTTPS、SOCKS4、SOCKS5 代理</li><li>支援八國語言介面</li></ul>' },
    addProxy: { title: '新增代理', content: '<ol><li>點擊擴充功能圖示開啟彈出視窗</li><li>點擊 <strong>新增代理</strong> 按鈕</li><li>填寫代理資訊：名稱、類型、主機位址、連接埠、帳號密碼</li><li>點擊 <strong>儲存</strong></li></ol>' },
    useProxy: { title: '使用代理', content: '<ol><li>從下拉選單選擇要使用的代理</li><li>開啟旁邊的開關即可啟用代理</li><li>狀態列會顯示當前連線延遲（毫秒）</li><li>關閉開關則中斷代理</li></ol>' },
    latency: { title: '延遲測試', content: '<p>當代理連線成功後，擴充功能會自動測試代理延遲並顯示結果。點擊延遲數值可手動刷新。</p>' },
    favorites: { title: '網站收藏', content: '<ol><li>在彈出視窗中選擇一個代理</li><li>點擊 <strong>收藏</strong> 按鈕</li><li>確認後，當前網站會被記住</li><li>下次訪問該網站時，代理會自動啟用</li></ol>' },
    modes: { title: '代理模式', content: '<p><strong>注意：收藏網域在任何模式下都會被代理，優先級最高。</strong></p><ul><li><strong>頁面模式</strong>：僅代理當前標籤頁的網域，切換標籤頁時自動切換代理狀態</li><li><strong>全域模式</strong>：代理所有流量</li><li><strong>規則模式</strong>：僅代理預設的不可訪問網域和收藏網域</li></ul>' },
    cascade: { title: '級聯代理', content: '<p>開啟級聯代理後，從已代理的標籤頁中開啟的新標籤頁也會自動代理。可在設定中關閉此功能。</p>' },
    shortcuts: { title: '快速鍵', content: '<p>使用鍵盤快速鍵快速切換代理：</p><ul><li>Windows/Linux: <code>Ctrl+Shift+P</code></li><li>macOS: <code>Command+Shift+P</code></li></ul>' },
    settings: { title: '設定頁面', content: '<ul><li><strong>啟動時恢復代理</strong>：瀏覽器啟動時自動恢復上次代理</li><li><strong>快速鍵開關</strong>：啟用/停用快速鍵切換</li><li><strong>級聯代理</strong>：從代理標籤頁開啟的新標籤頁也自動代理</li><li><strong>代理白名單</strong>：不經過代理的網站列表</li><li><strong>規則網域</strong>：規則模式下的代理網域列表</li><li><strong>語言設定</strong>：切換介面語言</li></ul>' },
    disclaimer: { title: '聲明', content: '<p>本擴充功能參考了 Chrome 線上應用程式商店中的 <a href="https://chromewebstore.google.com/detail/fjnpcbjdpbhbdlnkncaoennjdkoegmof?utm_source=item-share-cb" target="_blank">Easy Proxy Switcher</a> 擴充功能，並進行了優化改進。感謝原作者：<strong>xubaifu97</strong>。如有侵權請立即聯繫刪除。</p>' }
  },
  en: {
    overview: { title: 'Overview', content: '<p>Smart Proxy is a browser proxy management extension with latency testing and website favorites.</p><h3>Key Features</h3><ul><li>Quickly switch between proxy servers</li><li>Real-time latency display (ms)</li><li>Favorite websites for auto proxy</li><li>Support HTTP, HTTPS, SOCKS4, SOCKS5</li><li>8-language interface</li></ul>' },
    addProxy: { title: 'Adding a Proxy', content: '<ol><li>Click the extension icon to open the popup</li><li>Click <strong>Add Proxy</strong></li><li>Fill in: name, type, host, port, username/password</li><li>Click <strong>Save</strong></li></ol>' },
    useProxy: { title: 'Using a Proxy', content: '<ol><li>Select a proxy from the dropdown</li><li>Toggle the switch to enable</li><li>Status bar shows latency (ms)</li><li>Toggle off to disconnect</li></ol>' },
    latency: { title: 'Latency Testing', content: '<p>When connected, latency is automatically tested and displayed. Click the latency value to refresh manually.</p>' },
    favorites: { title: 'Website Favorites', content: '<ol><li>Select a proxy in the popup</li><li>Click <strong>Favorite</strong></li><li>The current website is remembered</li><li>Next visit auto-enables proxy</li></ol>' },
    modes: { title: 'Proxy Modes', content: '<p><strong>Note: Favorited domains are proxied in all modes with the highest priority.</strong></p><ul><li><strong>Page mode</strong>: Only proxies the current tab domain, auto-switches when changing tabs</li><li><strong>Global mode</strong>: Proxies all traffic</li><li><strong>Rule mode</strong>: Only proxies preset inaccessible domains and favorites</li></ul>' },
    cascade: { title: 'Cascade Proxy', content: '<p>When enabled, new tabs opened from a proxied tab will also be proxied automatically. Can be disabled in settings.</p>' },
    shortcuts: { title: 'Keyboard Shortcuts', content: '<p>Toggle proxy quickly:</p><ul><li>Windows/Linux: <code>Ctrl+Shift+P</code></li><li>macOS: <code>Command+Shift+P</code></li></ul>' },
    settings: { title: 'Settings Page', content: '<ul><li><strong>Restore on startup</strong>: Auto-restore proxy when browser starts</li><li><strong>Quick switch</strong>: Enable/disable keyboard shortcut</li><li><strong>Cascade proxy</strong>: Auto-proxy new tabs from proxied tabs</li><li><strong>Bypass list</strong>: Hosts that bypass proxy</li><li><strong>Rule domains</strong>: Domains for rule mode</li><li><strong>Language</strong>: Switch interface language</li></ul>' },
    disclaimer: { title: 'Disclaimer', content: '<p>This extension was inspired by <a href="https://chromewebstore.google.com/detail/fjnpcbjdpbhbdlnkncaoennjdkoegmof?utm_source=item-share-cb" target="_blank">Easy Proxy Switcher</a> from the Chrome Web Store and has been optimized. Thanks to the original author: <strong>xubaifu97</strong>. Contact for removal if infringing.</p>' }
  },
  ja: {
    overview: { title: '概要', content: '<p>Smart Proxy は遅延テストとウェブサイトお気に入り機能を備えたプロキシ管理拡張機能です。</p><h3>主な機能</h3><ul><li>プロキシサーバーの素早い切り替え</li><li>リアルタイム遅延表示（ミリ秒）</li><li>お気に入りサイトの自動プロキシ</li><li>HTTP/HTTPS/SOCKS4/SOCKS5 対応</li><li>8言語インターフェース</li></ul>' },
    addProxy: { title: 'プロキシの追加', content: '<ol><li>拡張アイコンをクリック</li><li><strong>プロキシ追加</strong>をクリック</li><li>名前、タイプ、ホスト、ポート、認証情報を入力</li><li><strong>保存</strong>をクリック</li></ol>' },
    useProxy: { title: 'プロキシの使用', content: '<ol><li>ドロップダウンからプロキシを選択</li><li>スイッチをオンに</li><li>遅延（ミリ秒）が表示されます</li><li>スイッチをオフで切断</li></ol>' },
    latency: { title: '遅延テスト', content: '<p>接続後、遅延が自動テストされ表示されます。クリックで手動更新できます。</p>' },
    favorites: { title: 'お気に入り', content: '<ol><li>プロキシを選択</li><li><strong>お気に入り</strong>をクリック</li><li>現在のサイトが記憶されます</li><li>次回訪問時に自動プロキシ</li></ol>' },
    modes: { title: 'プロキシモード', content: '<p><strong>注意：お気に入りドメインはすべてのモードで最優先でプロキシされます。</strong></p><ul><li><strong>ページモード</strong>：現在のタブのドメインのみプロキシ、タブ切替時に自動切替</li><li><strong>グローバルモード</strong>：全流量をプロキシ</li><li><strong>ルールモード</strong>：プリセットドメインとお気に入りのみプロキシ</li></ul>' },
    cascade: { title: 'カスケードプロキシ', content: '<p>有効にすると、プロキシされたタブから開かれた新しいタブも自動的にプロキシされます。設定で無効にできます。</p>' },
    shortcuts: { title: 'ショートカット', content: '<p><code>Ctrl+Shift+P</code>（Mac: <code>Command+Shift+P</code>）でプロキシを切り替え</p>' },
    settings: { title: '設定', content: '<ul><li><strong>起動時復元</strong>：ブラウザ起動時にプロキシを復元</li><li><strong>ショートカット</strong>：キーボードショートカットの有効/無効</li><li><strong>カスケードプロキシ</strong>：新しいタブに自動プロキシ</li><li><strong>バイパスリスト</strong>：プロキシを迂回するサイト</li><li><strong>ルールドメイン</strong>：ルールモードのドメイン</li><li><strong>言語設定</strong>：インターフェース言語の切替</li></ul>' },
    disclaimer: { title: '免責事項', content: '<p>この拡張機能は <a href="https://chromewebstore.google.com/detail/fjnpcbjdpbhbdlnkncaoennjdkoegmof?utm_source=item-share-cb" target="_blank">Easy Proxy Switcher</a> を参考に開発され、最適化されています。原作者：<strong>xubaifu97</strong>。著作権侵害の場合はご連絡ください。</p>' }
  },
  ko: {
    overview: { title: '개요', content: '<p>Smart Proxy는 지연 시간 테스트와 웹사이트 즐겨찾기 기능을 갖춘 프록시 관리 확장 프로그램입니다.</p><h3>주요 기능</h3><ul><li>프록시 서버 간 빠른 전환</li><li>실시간 지연 시간 표시 (밀리초)</li><li>즐겨찾기 자동 프록시</li><li>HTTP/HTTPS/SOCKS4/SOCKS5 지원</li><li>8개 언어 인터페이스</li></ul>' },
    addProxy: { title: '프록시 추가', content: '<ol><li>확장 프로그램 아이콘 클릭</li><li><strong>프록시 추가</strong> 클릭</li><li>이름, 유형, 호스트, 포트, 인증 정보 입력</li><li><strong>저장</strong> 클릭</li></ol>' },
    useProxy: { title: '프록시 사용', content: '<ol><li>드롭다운에서 프록시 선택</li><li>스위치를 켜서 활성화</li><li>지연 시간(밀리초) 표시</li><li>스위치 끄기로 연결 해제</li></ol>' },
    latency: { title: '지연 시간 테스트', content: '<p>연결 후 자동으로 지연 시간이 테스트되어 표시됩니다. 클릭하면 수동으로 새로고침할 수 있습니다.</p>' },
    favorites: { title: '즐겨찾기', content: '<ol><li>프록시 선택</li><li><strong>즐겨찾기</strong> 클릭</li><li>현재 사이트가 기억됩니다</li><li>다음 방문 시 자동 프록시</li></ol>' },
    modes: { title: '프록시 모드', content: '<p><strong>주의: 즐겨찾기 도메인은 모든 모드에서 최우선으로 프록시됩니다.</strong></p><ul><li><strong>페이지 모드</strong>: 현재 탭 도메인만 프록시, 탭 전환 시 자동 전환</li><li><strong>글로벌 모드</strong>: 모든 트래픽 프록시</li><li><strong>규칙 모드</strong>: 프리셋 도메인과 즐겨찾지만 프록시</li></ul>' },
    cascade: { title: '캐스케이드 프록시', content: '<p>활성화하면 프록시된 탭에서 열린 새 탭도 자동으로 프록시됩니다. 설정에서 비활성화할 수 있습니다.</p>' },
    shortcuts: { title: '단축키', content: '<p><code>Ctrl+Shift+P</code> (Mac: <code>Command+Shift+P</code>)로 프록시 전환</p>' },
    settings: { title: '설정', content: '<ul><li><strong>시작 시 복원</strong>: 브라우저 시작 시 프록시 복원</li><li><strong>단축키</strong>: 키보드 단축키 활성화/비활성화</li><li><strong>캐스케이드 프록시</strong>: 새 탭 자동 프록시</li><li><strong>우회 목록</strong>: 프록시를 거치지 않는 사이트</li><li><strong>규칙 도메인</strong>: 규칙 모드 도메인</li><li><strong>언어 설정</strong>: 인터페이스 언어 변경</li></ul>' },
    disclaimer: { title: '면책 조항', content: '<p>이 확장 프로그램은 <a href="https://chromewebstore.google.com/detail/fjnpcbjdpbhbdlnkncaoennjdkoegmof?utm_source=item-share-cb" target="_blank">Easy Proxy Switcher</a>를 참고하여 개발되었으며 최적화되었습니다. 원저작자: <strong>xubaifu97</strong>. 저작권 침해 시 연락해 주세요.</p>' }
  },
  fr: {
    overview: { title: 'Vue d\'ensemble', content: '<p>Smart Proxy est une extension de gestion de proxy avec test de latence et favoris.</p><h3>Fonctionnalités</h3><ul><li>Changement rapide de proxy</li><li>Latence en temps réel (ms)</li><li>Favoris pour proxy automatique</li><li>Support HTTP/HTTPS/SOCKS4/SOCKS5</li><li>Interface en 8 langues</li></ul>' },
    addProxy: { title: 'Ajouter un proxy', content: '<ol><li>Cliquez sur l\'icône de l\'extension</li><li>Cliquez sur <strong>Ajouter un proxy</strong></li><li>Remplissez: nom, type, hôte, port, authentification</li><li>Cliquez sur <strong>Enregistrer</strong></li></ol>' },
    useProxy: { title: 'Utiliser un proxy', content: '<ol><li>Sélectionnez un proxy</li><li>Activez le commutateur</li><li>La latence (ms) s\'affiche</li><li>Désactivez pour déconnecter</li></ol>' },
    latency: { title: 'Test de latence', content: '<p>La latence est testée automatiquement. Cliquez pour actualiser manuellement.</p>' },
    favorites: { title: 'Favoris', content: '<ol><li>Sélectionnez un proxy</li><li>Cliquez sur <strong>Favori</strong></li><li>Le site est mémorisé</li><li>Prochaine visite: proxy automatique</li></ol>' },
    modes: { title: 'Modes proxy', content: '<p><strong>Attention : Les domaines favoris sont proxifiés dans tous les modes avec la priorité la plus élevée.</strong></p><ul><li><strong>Mode page</strong>: Proxifie uniquement le domaine de l\'onglet actuel</li><li><strong>Mode global</strong>: Proxifie tout le trafic</li><li><strong>Mode règle</strong>: Proxifie uniquement les domaines prédéfinis et favoris</li></ul>' },
    cascade: { title: 'Proxy en cascade', content: '<p>Les nouveaux onglets ouverts depuis un onglet proxifié seront aussi proxifiés automatiquement.</p>' },
    shortcuts: { title: 'Raccourcis', content: '<p><code>Ctrl+Shift+P</code> (Mac: <code>Command+Shift+P</code>) pour basculer le proxy</p>' },
    settings: { title: 'Paramètres', content: '<ul><li><strong>Restaurer au démarrage</strong>: Restaurer le proxy au démarrage</li><li><strong>Raccourci rapide</strong>: Activer/désactiver le raccourci</li><li><strong>Proxy en cascade</strong>: Proxifier les nouveaux onglets</li><li><strong>Liste de contournement</strong>: Sites sans proxy</li><li><strong>Domaines de règles</strong>: Domaines pour le mode règle</li><li><strong>Langue</strong>: Changer la langue de l\'interface</li></ul>' },
    disclaimer: { title: 'Avertissement', content: '<p>Cette extension s\'inspire de <a href="https://chromewebstore.google.com/detail/fjnpcbjdpbhbdlnkncaoennjdkoegmof?utm_source=item-share-cb" target="_blank">Easy Proxy Switcher</a> et a été optimisée. Merci à l\'auteur original: <strong>xubaifu97</strong>. Contactez pour suppression en cas de violation.</p>' }
  },
  de: {
    overview: { title: 'Übersicht', content: '<p>Smart Proxy ist eine Proxy-Verwaltungserweiterung mit Latenztest und Favoriten.</p><h3>Funktionen</h3><ul><li>Schneller Proxy-Wechsel</li><li>Echtzeit-Latenzanzeige (ms)</li><li>Favoriten für Auto-Proxy</li><li>HTTP/HTTPS/SOCKS4/SOCKS5</li><li>8-Sprach-Oberfläche</li></ul>' },
    addProxy: { title: 'Proxy hinzufügen', content: '<ol><li>Erweiterungssymbol klicken</li><li><strong>Proxy hinzufügen</strong> klicken</li><li>Name, Typ, Host, Port, Auth eingeben</li><li><strong>Speichern</strong> klicken</li></ol>' },
    useProxy: { title: 'Proxy verwenden', content: '<ol><li>Proxy auswählen</li><li>Schalter aktivieren</li><li>Latenz (ms) wird angezeigt</li><li>Schalter deaktivieren zum Trennen</li></ol>' },
    latency: { title: 'Latenztest', content: '<p>Die Latenz wird automatisch getestet. Klicken Sie zum manuellen Aktualisieren.</p>' },
    favorites: { title: 'Favoriten', content: '<ol><li>Proxy auswählen</li><li><strong>Favorit</strong> klicken</li><li>Website wird gespeichert</li><li>Nächster Besuch: Auto-Proxy</li></ol>' },
    modes: { title: 'Proxy-Modi', content: '<p><strong>Hinweis: Favorisierte Domains werden in allen Modi mit höchster Priorität geproxied.</strong></p><ul><li><strong>Seitenmodus</strong>: Nur aktuelle Tab-Domain proxieren</li><li><strong>Globaler Modus</strong>: Gesamten Datenverkehr proxieren</li><li><strong>Regelmodus</strong>: Nur vordefinierte Domains und Favoriten</li></ul>' },
    cascade: { title: 'Kaskaden-Proxy', content: '<p>Neue Tabs von proxyten Tabs werden automatisch geproxied.</p>' },
    shortcuts: { title: 'Tastenkürzel', content: '<p><code>Ctrl+Shift+P</code> (Mac: <code>Command+Shift+P</code>) zum Umschalten</p>' },
    settings: { title: 'Einstellungen', content: '<ul><li><strong>Beim Start wiederherstellen</strong>: Proxy beim Start wiederherstellen</li><li><strong>Schnellumschalter</strong>: Tastenkürzel aktivieren</li><li><strong>Kaskaden-Proxy</strong>: Neue Tabs auto-proxieren</li><li><strong>Umgehungsliste</strong>: Sites ohne Proxy</li><li><strong>Regel-Domains</strong>: Domains für Regelmodus</li><li><strong>Sprache</strong>: Oberfläche-Sprache wechseln</li></ul>' },
    disclaimer: { title: 'Haftungsausschluss', content: '<p>Diese Erweiterung basiert auf <a href="https://chromewebstore.google.com/detail/fjnpcbjdpbhbdlnkncaoennjdkoegmof?utm_source=item-share-cb" target="_blank">Easy Proxy Switcher</a> und wurde optimiert. Danke an den Originalautor: <strong>xubaifu97</strong>. Bei Verstoß kontaktieren Sie uns zur Entfernung.</p>' }
  },
  es: {
    overview: { title: 'Resumen', content: '<p>Smart Proxy es una extensión de gestión de proxy con prueba de latencia y favoritos.</p><h3>Características</h3><ul><li>Cambio rápido de proxy</li><li>Latencia en tiempo real (ms)</li><li>Favoritos para proxy automático</li><li>Soporte HTTP/HTTPS/SOCKS4/SOCKS5</li><li>Interfaz en 8 idiomas</li></ul>' },
    addProxy: { title: 'Agregar proxy', content: '<ol><li>Haga clic en el icono</li><li>Haga clic en <strong>Agregar proxy</strong></li><li>Complete: nombre, tipo, host, puerto, autenticación</li><li>Haga clic en <strong>Guardar</strong></li></ol>' },
    useProxy: { title: 'Usar proxy', content: '<ol><li>Seleccione un proxy</li><li>Active el interruptor</li><li>Se muestra la latencia (ms)</li><li>Desactive para desconectar</li></ol>' },
    latency: { title: 'Prueba de latencia', content: '<p>La latencia se prueba automáticamente. Haga clic para actualizar manualmente.</p>' },
    favorites: { title: 'Favoritos', content: '<ol><li>Seleccione un proxy</li><li>Haga clic en <strong>Favorito</strong></li><li>El sitio se recordará</li><li>Próxima visita: proxy automático</li></ol>' },
    modes: { title: 'Modos proxy', content: '<p><strong>Nota: Los dominios favoritos se proxifican en todos los modes con la máxima prioridad.</strong></p><ul><li><strong>Modo página</strong>: Solo proxifica el dominio de la pestaña actual</li><li><strong>Modo global</strong>: Proxifica todo el tráfico</li><li><strong>Modo regla</strong>: Solo dominios predefinidos y favoritos</li></ul>' },
    cascade: { title: 'Proxy en cascada', content: '<p>Las nuevas pestañas abiertas desde pestañas con proxy también se proxean automáticamente.</p>' },
    shortcuts: { title: 'Atajos', content: '<p><code>Ctrl+Shift+P</code> (Mac: <code>Command+Shift+P</code>) para alternar</p>' },
    settings: { title: 'Configuración', content: '<ul><li><strong>Restaurar al inicio</strong>: Restaurar proxy al iniciar</li><li><strong>Atajo rápido</strong>: Activar/desactivar atajo</li><li><strong>Proxy en cascada</strong>: Auto-proxificar nuevas pestañas</li><li><strong>Lista de exclusión</strong>: Sitios sin proxy</li><li><strong>Dominios de reglas</strong>: Dominios para modo regla</li><li><strong>Idioma</strong>: Cambiar idioma de la interfaz</li></ul>' },
    disclaimer: { title: 'Aviso legal', content: '<p>Esta extensión se inspira en <a href="https://chromewebstore.google.com/detail/fjnpcbjdpbhbdlnkncaoennjdkoegmof?utm_source=item-share-cb" target="_blank">Easy Proxy Switcher</a> y ha sido optimizada. Gracias al autor original: <strong>xubaifu97</strong>. Contacte para eliminación en caso de infracción.</p>' }
  }
};

var sectionOrder = ['overview', 'addProxy', 'useProxy', 'latency', 'favorites', 'modes', 'cascade', 'shortcuts', 'settings', 'disclaimer'];

function renderHelp(lang) {
  var content = helpContent[lang] || helpContent['en'];
  var html = '';
  for (var i = 0; i < sectionOrder.length; i++) {
    var key = sectionOrder[i];
    if (content[key]) {
      html += '<div class="section"><h2>' + content[key].title + '</h2>' + content[key].content + '</div>';
    }
  }
  document.getElementById('helpContent').innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
  var langSelect = document.getElementById('langSelect');

  chrome.storage.local.get(['options'], function(result) {
    var lang = (result.options && result.options.language) || getDefaultLanguage();
    langSelect.value = lang;
    renderHelp(lang);
  });

  langSelect.addEventListener('change', function() {
    var newLang = langSelect.value;
    chrome.storage.local.get(['options'], function(result) {
      var options = result.options || {};
      options.language = newLang;
      chrome.storage.local.set({ options: options }, function() {
        renderHelp(newLang);
      });
    });
  });
});