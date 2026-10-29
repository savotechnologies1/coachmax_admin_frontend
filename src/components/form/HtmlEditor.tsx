import { useRef, useState, useEffect } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Code, Eye } from "lucide-react";

interface HtmlEditorProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export default function HtmlEditor({ id, value, onChange, placeholder = "", className = "", "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }: HtmlEditorProps) {
  const [isCodeView, setIsCodeView] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync value from prop to editor (only when editor content doesn't match prop)
  useEffect(() => {
    if (editorRef.current && !isCodeView) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value, isCodeView]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, argument: string = "") => {
    document.execCommand(command, false, argument);
    handleInput();
  };

  const toggleView = () => {
    setIsCodeView(!isCodeView);
  };

  return (
    <div className={`border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850 focus-within:border-brand-500 transition-all flex flex-col ${className}`}>

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 select-none">
        {!isCodeView && (
          <>
            <button
              type="button"
              onClick={() => executeCommand("bold")}
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700/50 rounded transition-all cursor-pointer"
              title="Bold"
            >
              <Bold size={15} />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("italic")}
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700/50 rounded transition-all cursor-pointer"
              title="Italic"
            >
              <Italic size={15} />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("underline")}
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700/50 rounded transition-all cursor-pointer"
              title="Underline"
            >
              <Underline size={15} />
            </button>
            <div className="w-[1px] h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            <button
              type="button"
              onClick={() => executeCommand("insertUnorderedList")}
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700/50 rounded transition-all cursor-pointer"
              title="Bullet List"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("insertOrderedList")}
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700/50 rounded transition-all cursor-pointer"
              title="Numbered List"
            >
              <ListOrdered size={15} />
            </button>
            <div className="w-[1px] h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
          </>
        )}
        <button
          type="button"
          onClick={toggleView}
          className={`p-1.5 rounded transition-all cursor-pointer ml-auto flex items-center gap-1.5 text-xs font-bold ${isCodeView
              ? "bg-brand-500 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700/50"
            }`}
          title={isCodeView ? "Switch to Visual View" : "Switch to Code View"}
        >
          {isCodeView ? (
            <>
              <Eye size={14} />
              Visual
            </>
          ) : (
            <>
              <Code size={14} />
              HTML Code
            </>
          )}
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="relative flex-1 flex flex-col min-h-[140px]">
        {isCodeView ? (
          <textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
            className="w-full flex-1 p-4 bg-gray-950 text-emerald-400 font-mono text-xs outline-none resize-none min-h-[140px]"
            placeholder="<p>Write your raw HTML here...</p>"
          />
        ) : (
          <div
            ref={editorRef}
            id={id}
            contentEditable
            role="textbox"
            aria-multiline="true"
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
            onInput={handleInput}
            className="w-full flex-1 p-4 outline-none text-sm font-medium text-gray-900 dark:text-white overflow-y-auto prose dark:prose-invert max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
            data-placeholder={placeholder}
            style={{ minHeight: "140px" }}
          />
        )}
      </div>
    </div>
  );
}
