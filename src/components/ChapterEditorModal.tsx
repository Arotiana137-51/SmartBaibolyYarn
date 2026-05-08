import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {WebView, type WebViewMessageEvent} from 'react-native-webview';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../contexts/ThemeContext';
import {TEXT_STYLES, scaleFontSize} from '../constants/Typography';
import type {
  ChapterDisplay,
  ChapterMark,
  MarkStyle,
} from '../utils/chapterMarks';

interface ChapterEditorModalProps {
  visible: boolean;
  reference: string;
  chapter: ChapterDisplay | null;
  initialMarks: ChapterMark[];
  initialScrollVerseNumber?: number | null;
  fontScale: number;
  highlightColor: string;
  onSave: (marks: ChapterMark[]) => void;
  onClear: () => void;
  onClose: () => void;
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildHtml = (
  chapter: ChapterDisplay,
  initialMarks: ChapterMark[],
  fontSize: number,
  lineHeight: number,
  textColor: string,
  bgColor: string,
  verseNumberColor: string,
  highlightColor: string,
): string => {
  const versesHtml = chapter.verses
    .map(v => {
      const safe = escapeHtml(v.displayText);
      const titleHtml = v.title
        ? `<div class="verse-title">${escapeHtml(v.title)}</div>`
        : '';
      return `${titleHtml}<p class="verse" data-verse="${v.verseNumber}"><span class="vn" contenteditable="false">${v.verseNumber}&nbsp;</span><span class="vt" data-verse="${v.verseNumber}">${safe}</span></p>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; padding: 0; background: ${bgColor}; color: ${textColor};
    font-size: ${fontSize}px; line-height: ${lineHeight}px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-text-size-adjust: 100%; -webkit-tap-highlight-color: transparent; }
  #editor { padding: 14px 16px 80px 16px; outline: none; }
  .verse { margin: 0 0 8px 0; text-align: justify; }
  .vn { color: ${verseNumberColor}; font-weight: 700; font-size: ${Math.round(fontSize * 0.85)}px; vertical-align: super; padding-right: 2px; user-select: none; -webkit-user-select: none; }
  .vt { white-space: pre-wrap; }
  .verse-title { font-style: italic; opacity: 0.7; margin: 6px 0 4px; user-select: none; -webkit-user-select: none; }
  mark.hl { background: ${highlightColor}; color: inherit; padding: 0; }
  ::selection { background: rgba(10, 132, 255, 0.35); }
</style>
</head>
<body>
<div id="editor" contenteditable="false" spellcheck="false" autocorrect="off" autocapitalize="off" style="user-select: text; -webkit-user-select: text; -webkit-touch-callout: default;">${versesHtml}</div>
<script>
(function() {
  var INITIAL = ${JSON.stringify(initialMarks)};
  var SEPARATOR = ${JSON.stringify(chapter.separator)};
  var editor = document.getElementById('editor');

  var __suppressMarkPosts = false;
  function rn(payload) {
    if (__suppressMarkPosts && payload && payload.type === 'MARK') return;
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }

  function clearVisualFormatting(start, end) {
    try {
      editor.contentEditable = 'true';
      try { selectRange(start, end); } catch (e0) {}
      // Some WebViews keep <mark> wrappers around even after removeFormat/hiliteColor.
      // Unwrap any highlight marks that intersect the current selection.
      try {
        var sel = window.getSelection();
        var r = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
        if (r && typeof r.intersectsNode === 'function') {
          var marks = Array.prototype.slice.call(editor.querySelectorAll('mark.hl'));
          marks.forEach(function(m) {
            try {
              if (!r.intersectsNode(m)) return;
              var parent = m.parentNode;
              if (!parent) return;
              while (m.firstChild) parent.insertBefore(m.firstChild, m);
              parent.removeChild(m);
            } catch (eU) {}
          });
        }
      } catch (eM) {}
      try { document.execCommand('removeFormat', false, null); } catch (e1) {}
      try {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('hiliteColor', false, 'transparent');
      } catch (e2) {}
      editor.contentEditable = 'false';
    } catch (e) {
      try { editor.contentEditable = 'false'; } catch (e0) {}
    }
  }

  function getVtNodes() {
    return Array.prototype.slice.call(editor.querySelectorAll('.vt'));
  }

  // Map a DOM range endpoint (node, offset) to an index in concatenated chapterText.
  // chapterText = vt[0].textContent + SEP + vt[1].textContent + SEP + ...
  function endpointToOffset(node, offset) {
    var vtNodes = getVtNodes();
    var total = 0;
    for (var i = 0; i < vtNodes.length; i++) {
      var vt = vtNodes[i];
      if (vt === node || vt.contains(node)) {
        // Build a range from start of vt to (node, offset) and measure.
        var r = document.createRange();
        r.setStart(vt, 0);
        try { r.setEnd(node, offset); } catch (e) { r.setEnd(vt, vt.childNodes.length); }
        var inner = r.toString().length;
        return total + inner;
      }
      total += vt.textContent.length;
      if (i < vtNodes.length - 1) total += SEPARATOR.length;
    }
    return total;
  }

  function getSelectionOffsets() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    var range = sel.getRangeAt(0);
    if (range.collapsed) return null;
    if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return null;
    var start = endpointToOffset(range.startContainer, range.startOffset);
    var end = endpointToOffset(range.endContainer, range.endOffset);
    if (end < start) { var t = start; start = end; end = t; }
    if (end <= start) return null;
    return { start: start, end: end };
  }

  function notifySelection() {
    try {
      var off = getSelectionOffsets();
      if (off) { window.__lastSelection = off; }
      rn({ type: 'SELECTION', offsets: off });
    } catch (e) {
      rn({ type: 'SELECTION', offsets: null });
    }
  }

  // Map a chapterText offset to a DOM (node, localOffset) inside .vt nodes.
  function offsetToDom(offset) {
    var vtNodes = getVtNodes();
    var consumed = 0;
    for (var i = 0; i < vtNodes.length; i++) {
      var vt = vtNodes[i];
      var len = vt.textContent.length;
      if (offset <= consumed + len) {
        var local = offset - consumed;
        // Walk text nodes inside vt to find node + offset.
        var walker = document.createTreeWalker(vt, NodeFilter.SHOW_TEXT, null);
        var n; var seen = 0;
        while ((n = walker.nextNode())) {
          var nl = n.nodeValue.length;
          if (local <= seen + nl) {
            return { node: n, offset: local - seen };
          }
          seen += nl;
        }
        return { node: vt, offset: vt.childNodes.length };
      }
      consumed += len;
      if (i < vtNodes.length - 1) consumed += SEPARATOR.length;
    }
    var last = vtNodes[vtNodes.length - 1];
    return { node: last, offset: last ? last.childNodes.length : 0 };
  }

  function selectRange(start, end) {
    var s = offsetToDom(start);
    var e = offsetToDom(end);
    var r = document.createRange();
    r.setStart(s.node, s.offset);
    r.setEnd(e.node, e.offset);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }

  function applyExec(cmd) {
    var off = getSelectionOffsets();
    if (!off) { rn({ type: 'NO_SELECTION' }); return; }
    // Temporarily make editable for formatting
    editor.contentEditable = 'true';
    // Some Android WebViews lose the selection when toggling editability.
    // Re-select the saved offsets so execCommand applies to the intended range.
    try { selectRange(off.start, off.end); } catch (e0) {}
    // queryCommandState BEFORE execCommand tells us whether the selection was
    // already styled — if it was, execCommand is going to toggle it OFF.
    var wasActive = false;
    try { wasActive = !!document.queryCommandState(cmd); } catch (eQ) { wasActive = false; }
    document.execCommand(cmd, false, null);
    editor.contentEditable = 'false';
    var style = cmd === 'bold' ? 'bold' : cmd === 'italic' ? 'italic' : 'underline';
    if (wasActive) {
      // Toggling off: tell RN to remove this style across [start,end] without
      // disturbing other styles (highlight, the other two text styles).
      rn({ type: 'UNMARK', style: style, start: off.start, end: off.end });
    } else {
      rn({ type: 'MARK', mark: { style: style, start: off.start, end: off.end } });
    }
  }

  function applyHighlight(color) {
    var off = getSelectionOffsets();
    if (!off) { rn({ type: 'NO_SELECTION' }); return; }
    // Persist FIRST so save works even if visual wrapping fails on this WebView.
    // Note: highlight does not auto-toggle here — to remove a highlight the user
    // selects the range and taps "Fafao". This keeps highlight independent of the
    // bold/italic/underline toggle behavior so a user re-tapping H to layer color
    // never accidentally erases their existing highlight.
    rn({ type: 'MARK', mark: { style: 'highlight', start: off.start, end: off.end, color: color } });
    try {
      var sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      var range = sel.getRangeAt(0);
      editor.contentEditable = 'true';
      // Same issue as applyExec: ensure selection is still the intended range.
      try {
        selectRange(off.start, off.end);
        sel = window.getSelection();
        if (sel && sel.rangeCount) range = sel.getRangeAt(0);
      } catch (eSel) {}
      var ok = false;
      try {
        document.execCommand('styleWithCSS', false, true);
        ok = document.execCommand('hiliteColor', false, color || '#FFEB3B');
      } catch (e1) { ok = false; }
      if (!ok) {
        try {
          var contents = range.extractContents();
          var mark = document.createElement('mark');
          mark.className = 'hl';
          if (color) mark.style.backgroundColor = color;
          mark.appendChild(contents);
          range.insertNode(mark);
        } catch (e2) {
          rn({ type: 'HL_VISUAL_ERROR', message: String(e2 && e2.message || e2) });
        }
      }
      editor.contentEditable = 'false';
      var sel2 = window.getSelection();
      if (sel2) sel2.removeAllRanges();
    } catch (e) {
      rn({ type: 'HL_ERROR', message: String(e && e.message || e) });
    }
  }

  // Merge overlapping same-style ranges so toggle-based execCommand calls don't
  // accidentally undo themselves on the second application over the same span.
  function mergeMarks(marks) {
    var byKey = {};
    (marks || []).forEach(function(m) {
      var key = m.style === 'highlight' ? 'highlight:' + (m.color || '') : m.style;
      (byKey[key] = byKey[key] || []).push(m);
    });
    var out = [];
    Object.keys(byKey).forEach(function(k) {
      var arr = byKey[k].slice().sort(function(a, b) { return a.start - b.start; });
      var cur = null;
      arr.forEach(function(m) {
        if (!cur) { cur = {start: m.start, end: m.end, style: m.style, color: m.color}; return; }
        if (m.start <= cur.end) {
          if (m.end > cur.end) cur.end = m.end;
        } else {
          out.push(cur);
          cur = {start: m.start, end: m.end, style: m.style, color: m.color};
        }
      });
      if (cur) out.push(cur);
    });
    return out;
  }

  // Apply initial marks visually (best-effort) by selecting each range and applying the style.
  // Suppress MARK re-broadcasts so these existing marks don't get duplicated in pendingMarks.
  function applyInitial() {
    if (!INITIAL || !INITIAL.length) return;
    __suppressMarkPosts = true;
    try {
      mergeMarks(INITIAL).forEach(function(m) {
        try {
          selectRange(m.start, m.end);
          if (m.style === 'highlight') applyHighlight(m.color);
          else {
            editor.contentEditable = 'true';
            document.execCommand(m.style, false, null);
            editor.contentEditable = 'false';
          }
        } catch (e) {}
      });
    } finally {
      __suppressMarkPosts = false;
    }
    var sel = window.getSelection(); if (sel) sel.removeAllRanges();
  }

  window.RNEditor = {
    bold: function() { applyExec('bold'); },
    italic: function() { applyExec('italic'); },
    underline: function() { applyExec('underline'); },
    highlight: function(color) { applyHighlight(color); },
    rerenderMarks: function(newMarks) {
      try {
        // Strip ALL existing formatting from every .vt by resetting it to its original text.
        var vts = getVtNodes();
        for (var i = 0; i < vts.length; i++) {
          var orig = vts[i].dataset.originalText;
          if (typeof orig === 'string') {
            vts[i].innerHTML = '';
            vts[i].textContent = orig;
          }
        }

        // Merge overlapping same-style ranges so toggle-based execCommand calls don't
        // accidentally undo themselves on the second pass over the same span.
        var merged = mergeMarks(newMarks);

        // Re-apply every mark from scratch using the same code path as initial render.
        __suppressMarkPosts = true;
        try {
          merged.forEach(function(m) {
            try {
              selectRange(m.start, m.end);
              if (m.style === 'highlight') {
                applyHighlight(m.color);
              } else {
                editor.contentEditable = 'true';
                document.execCommand(m.style, false, null);
                editor.contentEditable = 'false';
              }
            } catch (eM) {}
          });
        } finally {
          __suppressMarkPosts = false;
        }

        var sel = window.getSelection();
        try { if (sel) sel.removeAllRanges(); } catch (e1) {}
        notifySelection();
      } catch (e) {
        notifySelection();
      }
    },
    clearAll: function() {
      // Strip all formatting: re-render plain content.
      var vts = getVtNodes();
      for (var i = 0; i < vts.length; i++) {
        vts[i].innerHTML = '';
        vts[i].textContent = vts[i].dataset.originalText || vts[i].textContent;
      }
      rn({ type: 'CLEARED' });
    },
    getSelectionOffsets: function() {
      var off = getSelectionOffsets();
      rn({ type: 'SELECTION', offsets: off });
    },
    eraseSelection: function() {
      // Read the live DOM selection from inside the WebView (RN-side
      // selectionOffsets state can get cleared the moment the footer button
      // is tapped). Fall back to the last cached selection if needed.
      var off = getSelectionOffsets();
      if (!off) {
        if (typeof window.__lastSelection === 'object' && window.__lastSelection) {
          off = window.__lastSelection;
        }
      }
      if (!off) { rn({ type: 'NO_SELECTION' }); return; }
      clearVisualFormatting(off.start, off.end);
      rn({ type: 'ERASE_RANGE', start: off.start, end: off.end });
    }
  };

  // Track the last non-null selection so eraseSelection has a fallback.
  window.__lastSelection = null;

  // Save original text for clearAll.
  getVtNodes().forEach(function(vt) { vt.dataset.originalText = vt.textContent; });

  document.addEventListener('selectionchange', function() {
    // Don't spam RN while applying initial marks.
    if (__suppressMarkPosts) return;
    notifySelection();
  });

  applyInitial();
  rn({ type: 'READY' });
})();
true;
</script>
</body></html>`;
};

const ChapterEditorModal: React.FC<ChapterEditorModalProps> = ({
  visible,
  reference,
  chapter,
  initialMarks,
  initialScrollVerseNumber,
  fontScale,
  highlightColor,
  onSave,
  onClear,
  onClose,
}) => {
  const {theme} = useTheme();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [pendingMarks, setPendingMarks] = useState<ChapterMark[]>(initialMarks);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<string>(highlightColor);
  const [selectionOffsets, setSelectionOffsets] = useState<
    {start: number; end: number} | null
  >(null);
  
  const highlightColors = [
    '#FFEB3B', // Yellow
    '#FF9800', // Orange  
    '#F44336', // Red
    '#E91E63', // Pink
    '#9C27B0', // Purple
    '#673AB7', // Deep Purple
    '#3F51B5', // Indigo
    '#2196F3', // Blue
    '#00BCD4', // Cyan
    '#4CAF50', // Green
    '#8BC34A', // Light Green
    '#CDDC39', // Lime
  ];

  React.useEffect(() => {
    if (visible) setPendingMarks(initialMarks);
  }, [visible, initialMarks]);

  const fontSize = scaleFontSize(TEXT_STYLES.body.fontSize, fontScale);
  const lineHeight = Math.round(fontSize * 1.5);

  const html = useMemo(() => {
    if (!chapter) return '';
    return buildHtml(
      chapter,
      initialMarks,
      fontSize,
      lineHeight,
      theme.colors.readerText,
      theme.colors.backgroundSecondary,
      theme.colors.verseNumber,
      highlightColor,
    );
  }, [
    chapter,
    initialMarks,
    fontSize,
    lineHeight,
    theme.colors.readerText,
    theme.colors.backgroundSecondary,
    theme.colors.verseNumber,
    highlightColor,
  ]);

  const inject = useCallback((js: string) => {
    webViewRef.current?.injectJavaScript(js);
  }, []);

  const scrollToVerse = useCallback(
    (verseNumber: number) => {
      const js = `(function(){
        try {
          var el = document.querySelector('[data-verse="' + ${JSON.stringify(
            String(verseNumber),
          )} + '"]');
          if (!el) return true;
          el.scrollIntoView({block: 'start', behavior: 'auto'});
          return true;
        } catch (e) { return true; }
      })(); true;`;
      inject(js);
    },
    [inject],
  );

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'MARK' && msg.mark) {
        const m: ChapterMark = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          start: msg.mark.start,
          end: msg.mark.end,
          style: msg.mark.style as MarkStyle,
          color:
            msg.mark.style === 'highlight'
              ? (msg.mark.color || selectedHighlightColor || '#FFEB3B')
              : undefined,
          createdAt: new Date().toISOString(),
        };
        setPendingMarks(prev => [...prev, m]);
      } else if (msg.type === 'UNMARK' && msg.style) {
        const removeStart: number = msg.start;
        const removeEnd: number = msg.end;
        const removeStyle = msg.style as MarkStyle;
        setPendingMarks(prev => {
          const next: ChapterMark[] = [];
          for (const existing of prev) {
            if (existing.style !== removeStyle) {
              next.push(existing);
              continue;
            }
            if (removeStart >= existing.end || removeEnd <= existing.start) {
              next.push(existing);
              continue;
            }
            if (removeStart <= existing.start && removeEnd >= existing.end) {
              continue;
            }
            if (existing.start < removeStart && removeEnd < existing.end) {
              next.push({...existing, id: `${existing.id}-l`, end: removeStart});
              next.push({...existing, id: `${existing.id}-r`, start: removeEnd});
              continue;
            }
            if (removeStart <= existing.start) {
              next.push({...existing, id: `${existing.id}-t`, start: removeEnd});
              continue;
            }
            next.push({...existing, id: `${existing.id}-t`, end: removeStart});
          }
          return next;
        });
      } else if (msg.type === 'ERASE_RANGE') {
        const eStart: number = msg.start;
        const eEnd: number = msg.end;
        if (typeof eStart !== 'number' || typeof eEnd !== 'number' || eEnd <= eStart) return;
        setPendingMarks(prev => {
          const next: ChapterMark[] = [];
          for (const m of prev) {
            if (eStart >= m.end || eEnd <= m.start) { next.push(m); continue; }
            if (eStart <= m.start && eEnd >= m.end) { continue; }
            if (m.start < eStart && eEnd < m.end) {
              next.push({...m, id: `${m.id}-l`, end: eStart});
              next.push({...m, id: `${m.id}-r`, start: eEnd});
              continue;
            }
            if (eStart <= m.start) { next.push({...m, id: `${m.id}-t`, start: eEnd}); continue; }
            next.push({...m, id: `${m.id}-t`, end: eStart});
          }
          const payload = JSON.stringify(next);
          inject(`window.RNEditor && window.RNEditor.rerenderMarks && window.RNEditor.rerenderMarks(${payload}); true;`);
          return next;
        });
        setSelectionOffsets(null);
      } else if (msg.type === 'NO_SELECTION') {
        setSelectionOffsets(null);
      } else if (msg.type === 'CLEARED') {
        setPendingMarks([]);
        setSelectionOffsets(null);
      } else if (msg.type === 'SELECTION') {
        const off = msg.offsets;
        if (off && typeof off.start === 'number' && typeof off.end === 'number') {
          setSelectionOffsets({start: off.start, end: off.end});
        } else {
          setSelectionOffsets(null);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSave = () => {
    onSave(pendingMarks);
  };

  const handleEraseSelection = () => {
    // Delegate to the WebView. It reads the live DOM selection (or the cached
    // last-known selection) and posts ERASE_RANGE back, which we handle in
    // onMessage. This avoids the race where RN's selectionOffsets state may
    // be cleared by the time the user taps Fafao.
    inject('window.RNEditor && window.RNEditor.eraseSelection && window.RNEditor.eraseSelection(); true;');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          {paddingTop: insets.top, paddingBottom: insets.bottom},
        ]}>
        <View
          style={[
            styles.card,
            {backgroundColor: theme.colors.backgroundSecondary},
          ]}>
          <View
            style={[styles.header, {borderBottomColor: theme.colors.divider}]}>
            <Text style={[styles.title, {color: theme.colors.textPrimary}]}>
              {reference}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={[styles.closeIcon, {color: theme.colors.textPrimary}]}>
                ×
              </Text>
            </Pressable>
          </View>

          <View style={styles.toolbar}>
            <ToolbarButton
              label="B"
              bold
              onPress={() => inject('window.RNEditor && window.RNEditor.bold(); true;')}
              theme={theme}
            />
            <ToolbarButton
              label="I"
              italic
              onPress={() => inject('window.RNEditor && window.RNEditor.italic(); true;')}
              theme={theme}
            />
            <ToolbarButton
              label="U"
              underline
              onPress={() => inject('window.RNEditor && window.RNEditor.underline(); true;')}
              theme={theme}
            />
          </View>

          <View style={styles.colorPickerContainer}>
            <Text style={[styles.colorPickerLabel, {color: theme.colors.textSecondary}]}>
              Highlight Color:
            </Text>
            <View style={styles.colorPickerRow}>
              {highlightColors.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorOption,
                    {backgroundColor: color},
                    selectedHighlightColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedHighlightColor(color);
                    inject(`window.RNEditor && window.RNEditor.highlight(${JSON.stringify(color)}); true;`);
                  }}
                />
              ))}
            </View>
          </View>

          <View style={styles.webContainer}>
            {chapter ? (
              <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{html}}
                onMessage={onMessage}
                onLoadEnd={() => {
                  if (typeof initialScrollVerseNumber === 'number') {
                    scrollToVerse(initialScrollVerseNumber);
                  }
                }}
                javaScriptEnabled
                hideKeyboardAccessoryView
                automaticallyAdjustContentInsets={false}
                keyboardDisplayRequiresUserAction={false}
                style={{backgroundColor: theme.colors.backgroundSecondary}}
              />
            ) : null}
          </View>

          <View style={[styles.footer, {borderTopColor: theme.colors.divider}]}>
            <Pressable
              style={[
                styles.footerButton,
                {backgroundColor: theme.colors.backgroundTertiary},
                !selectionOffsets ? {opacity: 0.5} : null,
              ]}
              onPress={handleEraseSelection}
              disabled={!selectionOffsets}>
              <Text
                style={[styles.footerButtonText, {color: theme.colors.textPrimary}]}>
                Fafao
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.footerButton,
                styles.footerPrimary,
                {backgroundColor: theme.colors.accentBlue},
              ]}
              onPress={handleSave}>
              <Text style={[styles.footerButtonText, {color: '#FFFFFF'}]}>
                Tahirizo
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ToolbarButton = ({
  label,
  onPress,
  disabled,
  bold,
  italic,
  underline,
  accent,
  theme,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  accent?: string;
  theme: any;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.toolbarButton,
      {backgroundColor: accent ?? theme.colors.backgroundTertiary},
      disabled ? {opacity: 0.5} : null,
    ]}>
    <Text
      style={[
        styles.toolbarButtonText,
        {
          color: accent ? '#1B1B1B' : theme.colors.textPrimary,
          fontWeight: bold ? '900' : '700',
          fontStyle: italic ? 'italic' : 'normal',
          textDecorationLine: underline ? 'underline' : 'none',
        },
      ]}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    height: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    paddingRight: 12,
  },
  closeIcon: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 6,
  },
  toolbar: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  toolbarButton: {
    width: 44,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarButtonText: {
    fontSize: 16,
  },
  colorPickerContainer: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  colorPickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  colorPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 4,
  },
  colorOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  webContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 4,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  footerButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  footerPrimary: {
    minWidth: 96,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ChapterEditorModal;
