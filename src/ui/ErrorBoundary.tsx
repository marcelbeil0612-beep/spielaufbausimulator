import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type Props = {
  readonly children: ReactNode;
};

type State = {
  readonly error: Error | null;
};

/**
 * React-ErrorBoundary, der das gesamte App-Rendering einklammert. Fängt
 * Renderfehler (z. B. durch eine manipulierte, aber noch validatoren-
 * durchrutschende Scene) ab und zeigt eine minimalistische Fallback-UI,
 * statt die Seite komplett leer zu lassen. Der `Zurücksetzen`-Button
 * räumt das gespeicherte Szenario aus dem `localStorage` und lädt neu.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    try {
      console.error('[spielaufbau] Unerwarteter Fehler:', error, info);
    } catch {
      // Logging darf nicht werfen.
    }
  }

  private handleResetStorage = (): void => {
    try {
      const ls = globalThis.localStorage;
      ls?.removeItem('spielaufbau:lanes:v4');
      ls?.removeItem('spielaufbau:scene:v3');
      ls?.removeItem('spielaufbau:scene:v2');
      ls?.removeItem('spielaufbau:scene:v1');
    } catch {
      // Wenn Storage-Zugriff fehlschlägt, reicht das Reload unten.
    }
    globalThis.location?.reload();
  };

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <main
        role="alert"
        style={{
          padding: '24px',
          maxWidth: '640px',
          margin: '48px auto',
          fontFamily: 'system-ui, sans-serif',
          color: '#1c1c1c',
          lineHeight: 1.5,
        }}
      >
        <h1 style={{ marginTop: 0 }}>Etwas ist schiefgelaufen.</h1>
        <p>
          Der Simulator konnte nicht gerendert werden. Ursache ist meist ein
          beschädigter gespeicherter Zustand. Klick auf{' '}
          <strong>Zustand zurücksetzen</strong> leert die Session und lädt die App neu.
        </p>
        <pre
          style={{
            background: '#f3f3f3',
            padding: '8px 12px',
            borderRadius: 4,
            whiteSpace: 'pre-wrap',
            fontSize: 12,
          }}
        >
          {this.state.error.message}
        </pre>
        <button
          type="button"
          onClick={this.handleResetStorage}
          style={{
            marginTop: 12,
            padding: '8px 16px',
            border: '1px solid #1c1c1c',
            background: 'white',
            cursor: 'pointer',
            borderRadius: 999,
            font: 'inherit',
          }}
        >
          Zustand zurücksetzen und neu laden
        </button>
      </main>
    );
  }
}
